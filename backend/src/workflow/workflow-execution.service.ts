
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import {
  AIRequestType,
  AuditAction,
  Prisma,
  WorkflowStatus,
  WorkflowStepStatus,
} from '@prisma/client';
import { Queue } from 'bullmq';
import * as Sentry from '@sentry/node';
import { randomUUID } from 'node:crypto';
import { AuditService } from '../audit/audit.service';
import { CorrelationContextService } from '../common/context/correlation-context.service';
import { AppLoggerService } from '../common/logger/app-logger.service';
import { WorkflowMetrics } from '../common/metrics/workflow.metrics';
import { CommunicationService } from '../communication/communication.service';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import {
  calculateRetryDelayMs,
  resolveRetryPolicy,
  WorkflowRetryPolicyOverrides,
} from './workflow-retry-policy';
import { classifyWorkflowError, getErrorMessage } from './workflow-error-classifier';
import { redactSensitiveData } from './workflow-redaction.util';
import { WorkflowJobPayload, WorkflowReplayContext } from './workflow-job-payload';
import { WorkflowStepDedupService } from './workflow-step-dedup.service';

interface WorkflowStepDefinition {
  stepType: string;
  config: Record<string, unknown>;
  name?: string;
  retryPolicy?: WorkflowRetryPolicyOverrides;
}

interface PreparedReplayContext extends WorkflowReplayContext {
  fromStepIndex: number;
  dlqItemId?: string;
}

@Injectable()
export class WorkflowExecutionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly communicationService: CommunicationService,
    private readonly workflowStepDedupService: WorkflowStepDedupService,
    private readonly logger: AppLoggerService,
    private readonly metrics: WorkflowMetrics,
    private readonly correlationContext: CorrelationContextService,
    private readonly auditService: AuditService,
    @InjectQueue('workflows') private readonly workflowQueue: Queue,
  ) {}

  async createExecution(
    workflowId: string,
    organizationId: string,
    eventId: string | null,
    input: unknown,
    correlationId?: string,
  ) {
    const resolvedCorrelationId = this.resolveCorrelationId(correlationId);

    return this.correlationContext.runWithContext(
      {
        correlationId: resolvedCorrelationId,
        organizationId,
      },
      async () => {
        const execution = await this.prisma.workflowExecution.create({
          data: {
            workflowId,
            organizationId,
            eventId,
            status: WorkflowStatus.PENDING,
            input: input as never,
          },
          include: {
            workflow: true,
          },
        });

        await this.workflowQueue.add(
          'execute-workflow',
          {
            executionId: execution.id,
            correlationId: resolvedCorrelationId,
          } satisfies WorkflowJobPayload,
          {
            jobId: `wf:${execution.id}:initial`,
            attempts: 1,
          },
        );

        await this.updateQueueDepthMetric();
        this.metrics.incrementWorkflowRun(workflowId, organizationId, 'PENDING');

        this.logger.info('Workflow execution created and queued', {
          service: 'workflow-execution',
          correlationId: resolvedCorrelationId,
          executionId: execution.id,
          workflowId,
          organizationId,
          eventId,
          queue: 'workflows',
        });

        return execution;
      },
    );
  }

  async executeWorkflow(jobPayload: WorkflowJobPayload): Promise<void> {
    const resolvedCorrelationId = this.resolveCorrelationId(jobPayload.correlationId);

    return this.correlationContext.runWithContext(
      {
        correlationId: resolvedCorrelationId,
      },
      async () => {
        await this.executeWorkflowInternal(
          {
            ...jobPayload,
            correlationId: resolvedCorrelationId,
          },
          resolvedCorrelationId,
        );
      },
    );
  }

  private async executeWorkflowInternal(
    jobPayload: WorkflowJobPayload,
    correlationId: string,
  ): Promise<void> {
    const execution = await this.prisma.workflowExecution.findUnique({
      where: { id: jobPayload.executionId },
      include: {
        workflow: true,
      },
    });

    if (!execution) {
      throw new Error(`Execution ${jobPayload.executionId} not found`);
    }

    if (
      !jobPayload.replay &&
      execution.status !== WorkflowStatus.PENDING &&
      execution.status !== WorkflowStatus.RUNNING &&
      execution.status !== WorkflowStatus.DLQ_PENDING
    ) {
      this.logger.info('Workflow execution skipped because status is not executable', {
        service: 'workflow-execution',
        executionId: execution.id,
        workflowId: execution.workflowId,
        organizationId: execution.organizationId,
        status: execution.status,
      });
      return;
    }

    this.correlationContext.setOrganizationId(execution.organizationId);

    const workflowStart = Date.now();
    const steps = this.parseWorkflowSteps(execution.workflow.steps);

    let preparedReplay: PreparedReplayContext | undefined;
    if (jobPayload.replay) {
      preparedReplay = await this.prepareReplay(jobPayload.replay, execution.id, correlationId);
    }

    const startIndex = this.resolveStartIndex(execution.currentStep, steps.length, jobPayload, preparedReplay);
    let currentOutput = await this.resolveCurrentOutput(execution.id, execution.input, startIndex);

    await this.prisma.workflowExecution.update({
      where: { id: execution.id },
      data: {
        status: WorkflowStatus.RUNNING,
        startedAt: execution.startedAt ?? new Date(),
        completedAt: null,
      },
    });

    this.metrics.incrementWorkflowRun(execution.workflowId, execution.organizationId, 'RUNNING');
    await this.updateActiveWorkflowGauge(execution.organizationId);

    this.logger.info('Workflow execution started', {
      service: 'workflow-execution',
      executionId: execution.id,
      workflowId: execution.workflowId,
      organizationId: execution.organizationId,
      stepCount: steps.length,
      startIndex,
      correlationId,
      replayMode: preparedReplay?.mode,
    });
    try {
      for (let index = startIndex; index < steps.length; index += 1) {
        const stepDef = steps[index];

        const stepResult = await this.executeStepWithPersistence({
          executionId: execution.id,
          workflowId: execution.workflowId,
          organizationId: execution.organizationId,
          stepDef,
          stepIndex: index,
          input: currentOutput,
          correlationId,
          replay: preparedReplay,
        });

        if (stepResult.type === 'retry_scheduled') {
          await this.prisma.workflowExecution.update({
            where: { id: execution.id },
            data: {
              status: WorkflowStatus.RUNNING,
              currentStep: index,
              error: null,
            },
          });

          return;
        }

        if (stepResult.type === 'moved_to_dlq') {
          if (preparedReplay?.dlqItemId) {
            await this.recordReplayOutcome(
              preparedReplay.dlqItemId,
              execution.organizationId,
              preparedReplay.requestedByUserId,
              'failed',
              correlationId,
            );
          }

          return;
        }

        currentOutput = stepResult.output;

        await this.prisma.workflowExecution.update({
          where: { id: execution.id },
          data: {
            currentStep: index + 1,
          },
        });

        if (preparedReplay?.mode === 'STEP_ONLY') {
          const isLastStep = index >= steps.length - 1;

          await this.prisma.workflowExecution.update({
            where: { id: execution.id },
            data: {
              status: isLastStep ? WorkflowStatus.SUCCESS : WorkflowStatus.PARTIAL,
              output: currentOutput as never,
              completedAt: new Date(),
              error: null,
            },
          });

          if (preparedReplay.dlqItemId) {
            await this.resolveDlqItemAfterReplay(
              preparedReplay.dlqItemId,
              preparedReplay.requestedByUserId,
              execution.organizationId,
              correlationId,
              isLastStep ? 'Workflow replay completed successfully' : 'Step replay completed successfully',
            );

            await this.recordReplayOutcome(
              preparedReplay.dlqItemId,
              execution.organizationId,
              preparedReplay.requestedByUserId,
              'success',
              correlationId,
            );
          }

          return;
        }
      }

      const workflowDurationSeconds = (Date.now() - workflowStart) / 1000;
      await this.prisma.workflowExecution.update({
        where: { id: execution.id },
        data: {
          status: WorkflowStatus.SUCCESS,
          output: currentOutput as never,
          completedAt: new Date(),
          error: null,
        },
      });

      this.metrics.incrementWorkflowRun(execution.workflowId, execution.organizationId, 'SUCCESS');
      this.metrics.observeWorkflowRunDuration(execution.workflowId, workflowDurationSeconds);

      if (preparedReplay?.dlqItemId) {
        await this.resolveDlqItemAfterReplay(
          preparedReplay.dlqItemId,
          preparedReplay.requestedByUserId,
          execution.organizationId,
          correlationId,
          'Replay completed successfully',
        );

        await this.recordReplayOutcome(
          preparedReplay.dlqItemId,
          execution.organizationId,
          preparedReplay.requestedByUserId,
          'success',
          correlationId,
        );
      }

      this.logger.info('Workflow execution completed', {
        service: 'workflow-execution',
        executionId: execution.id,
        workflowId: execution.workflowId,
        organizationId: execution.organizationId,
        durationSeconds: workflowDurationSeconds,
      });
    } catch (error) {
      const message = getErrorMessage(error);

      await this.prisma.workflowExecution.update({
        where: { id: execution.id },
        data: {
          status: WorkflowStatus.FAILED,
          error: message,
          completedAt: new Date(),
        },
      });

      this.metrics.incrementWorkflowRun(execution.workflowId, execution.organizationId, 'FAILED');

      Sentry.captureException(error, {
        tags: {
          service: 'workflow-execution',
          workflowId: execution.workflowId,
          organizationId: execution.organizationId,
        },
        extra: {
          executionId: execution.id,
          correlationId,
        },
      });

      this.logger.error('Workflow execution failed', error, {
        service: 'workflow-execution',
        executionId: execution.id,
        workflowId: execution.workflowId,
        organizationId: execution.organizationId,
      });

      throw error;
    } finally {
      await this.updateActiveWorkflowGauge(execution.organizationId);
      await this.updateQueueDepthMetric();
    }
  }

  private async executeStepWithPersistence(params: {
    executionId: string;
    workflowId: string;
    organizationId: string;
    stepDef: WorkflowStepDefinition;
    stepIndex: number;
    input: unknown;
    correlationId: string;
    replay?: PreparedReplayContext;
  }): Promise<{ type: 'success'; output: unknown } | { type: 'retry_scheduled' } | { type: 'moved_to_dlq' }> {
    const {
      executionId,
      workflowId,
      organizationId,
      stepDef,
      stepIndex,
      input,
      correlationId,
      replay,
    } = params;

    const mergedOverrides = {
      ...(stepDef.retryPolicy || {}),
      ...(replay?.overrideRetryPolicy || {}),
    };

    const retryPolicy = resolveRetryPolicy(stepDef.stepType, mergedOverrides);
    const stepStartedAt = Date.now();

    let step = await this.prisma.workflowStep.upsert({
      where: {
        executionId_stepIndex: {
          executionId,
          stepIndex,
        },
      },
      create: {
        executionId,
        stepIndex,
        stepType: stepDef.stepType,
        config: stepDef.config as never,
        input: input as never,
        status: WorkflowStepStatus.PENDING,
        maxRetries: retryPolicy.maxRetries,
        correlationId,
        retryPolicyOverride: Object.keys(mergedOverrides).length > 0 ? (mergedOverrides as never) : undefined,
      },
      update: {
        input: input as never,
        config: stepDef.config as never,
        maxRetries: retryPolicy.maxRetries,
        correlationId,
        retryPolicyOverride:
          Object.keys(mergedOverrides).length > 0
            ? (mergedOverrides as never)
            : (Prisma.DbNull as never),
      },
    });
    if (step.status === WorkflowStepStatus.SUCCESS) {
      return {
        type: 'success',
        output: step.output ?? input,
      };
    }

    step = await this.prisma.workflowStep.update({
      where: { id: step.id },
      data: {
        status: WorkflowStepStatus.RUNNING,
        startedAt: new Date(),
        completedAt: null,
        nextRetryAt: null,
      },
    });

    this.metrics.incrementWorkflowStepAttempt(stepDef.stepType, organizationId);
    this.metrics.incrementWorkflowStep(stepDef.stepType, 'RUNNING');

    this.logger.info('Workflow step started', {
      service: 'workflow-execution',
      executionId,
      workflowId,
      organizationId,
      stepId: step.id,
      stepIndex,
      stepType: stepDef.stepType,
      replayMode: replay?.mode,
    });

    const dedup = await this.workflowStepDedupService.acquire({
      organizationId,
      workflowRunId: executionId,
      stepKey: String(stepIndex),
      input,
    });

    if (dedup.type === 'done') {
      await this.prisma.workflowStep.update({
        where: { id: step.id },
        data: {
          status: WorkflowStepStatus.SUCCESS,
          output: (dedup.result ?? input) as never,
          completedAt: new Date(),
          error: null,
          errorStack: null,
          nextRetryAt: null,
        },
      });

      const stepDurationSeconds = (Date.now() - stepStartedAt) / 1000;
      this.metrics.observeWorkflowStepDuration(stepDef.stepType, stepDurationSeconds);
      this.metrics.incrementWorkflowStep(stepDef.stepType, 'SUCCESS');

      this.logger.info('Workflow step deduplicated using existing done result', {
        service: 'workflow-execution',
        executionId,
        workflowId,
        organizationId,
        stepId: step.id,
        stepIndex,
        stepType: stepDef.stepType,
      });

      return {
        type: 'success',
        output: dedup.result ?? input,
      };
    }

    if (dedup.type === 'locked') {
      const lockRetryDelayMs = 1000;

      await this.workflowQueue.add(
        'execute-workflow',
        {
          executionId,
          correlationId,
          retryStepIndex: stepIndex,
        } satisfies WorkflowJobPayload,
        {
          delay: lockRetryDelayMs,
          attempts: 1,
          jobId: `wf:${executionId}:s:${stepIndex}:locked:${Date.now()}`,
        },
      );

      await this.updateQueueDepthMetric();

      this.logger.warn('Workflow step dedup lock exists; requeued for later execution', {
        service: 'workflow-execution',
        executionId,
        workflowId,
        organizationId,
        stepId: step.id,
        stepIndex,
        stepType: stepDef.stepType,
        lockRetryDelayMs,
      });

      return {
        type: 'retry_scheduled',
      };
    }

    try {
      const stepOutput = await this.executeStep(stepDef, input, organizationId, executionId, stepIndex);
      await this.workflowStepDedupService.markDone(dedup.lockId, stepOutput);

      await this.prisma.workflowStep.update({
        where: { id: step.id },
        data: {
          status: WorkflowStepStatus.SUCCESS,
          output: stepOutput as never,
          completedAt: new Date(),
          error: null,
          errorStack: null,
          nextRetryAt: null,
        },
      });

      const stepDurationSeconds = (Date.now() - stepStartedAt) / 1000;
      this.metrics.observeWorkflowStepDuration(stepDef.stepType, stepDurationSeconds);
      this.metrics.incrementWorkflowStep(stepDef.stepType, 'SUCCESS');

      this.logger.info('Workflow step completed', {
        service: 'workflow-execution',
        executionId,
        workflowId,
        organizationId,
        stepId: step.id,
        stepIndex,
        stepType: stepDef.stepType,
        durationSeconds: stepDurationSeconds,
      });

      return {
        type: 'success',
        output: stepOutput,
      };
    } catch (error) {
      try {
        await this.workflowStepDedupService.releaseLock(dedup.lockId);
      } catch (releaseError) {
        this.logger.warn('Failed to release step dedup lock after step failure', {
          service: 'workflow-execution',
          executionId,
          workflowId,
          organizationId,
          stepId: step.id,
          stepIndex,
          stepType: stepDef.stepType,
          releaseError: getErrorMessage(releaseError),
        });
      }
      const classification = classifyWorkflowError(error);
      const stepDurationSeconds = (Date.now() - stepStartedAt) / 1000;
      const attempt = step.attemptCount + 1;
      const firstFailedAt = step.firstFailedAt ?? new Date();
      const now = new Date();

      this.metrics.observeWorkflowStepDuration(stepDef.stepType, stepDurationSeconds);

      if (classification.retriable && attempt <= retryPolicy.maxRetries) {
        const delayMs = calculateRetryDelayMs(attempt, retryPolicy);
        const nextRetryAt = new Date(Date.now() + delayMs);

        await this.prisma.workflowStep.update({
          where: { id: step.id },
          data: {
            status: WorkflowStepStatus.RETRYING,
            error: classification.message,
            errorStack: classification.stack,
            attemptCount: attempt,
            maxRetries: retryPolicy.maxRetries,
            firstFailedAt,
            lastFailedAt: now,
            nextRetryAt,
            completedAt: null,
            correlationId,
          },
        });

        await this.workflowQueue.add(
          'execute-workflow',
          {
            executionId,
            correlationId,
            retryStepIndex: stepIndex,
            attempt,
          } satisfies WorkflowJobPayload,
          {
            delay: delayMs,
            attempts: 1,
            jobId: `wf:${executionId}:s:${stepIndex}:a:${attempt}`,
          },
        );

        await this.updateQueueDepthMetric();

        this.metrics.incrementWorkflowStep(stepDef.stepType, 'RETRYING');
        this.metrics.incrementWorkflowStepRetry(stepDef.stepType, classification.category, organizationId);

        this.logger.warn('Workflow step failed with retriable error; scheduled retry', {
          service: 'workflow-execution',
          executionId,
          workflowId,
          organizationId,
          stepId: step.id,
          stepIndex,
          stepType: stepDef.stepType,
          attempt,
          maxRetries: retryPolicy.maxRetries,
          delayMs,
          nextRetryAt: nextRetryAt.toISOString(),
          errorCategory: classification.category,
          error: classification.message,
        });

        return {
          type: 'retry_scheduled',
        };
      }

      await this.prisma.workflowStep.update({
        where: { id: step.id },
        data: {
          status: WorkflowStepStatus.DLQ,
          error: classification.message,
          errorStack: classification.stack,
          attemptCount: attempt,
          maxRetries: retryPolicy.maxRetries,
          firstFailedAt,
          lastFailedAt: now,
          nextRetryAt: null,
          completedAt: new Date(),
          correlationId,
        },
      });

      this.metrics.incrementWorkflowStep(stepDef.stepType, 'DLQ');
      this.metrics.incrementWorkflowDlqMove(stepDef.stepType, classification.category, organizationId);

      await this.moveStepToDlq({
        organizationId,
        executionId,
        stepId: step.id,
        stepType: stepDef.stepType,
        failureReason: classification.message,
        errorStack: classification.stack,
        errorCategory: classification.category,
        attemptCount: attempt,
        firstFailedAt,
        lastFailedAt: now,
        inputPayload: step.input,
        stepConfigSnapshot: step.config,
        correlationId,
      });

      this.logger.error('Workflow step moved to DLQ', error, {
        service: 'workflow-execution',
        executionId,
        workflowId,
        organizationId,
        stepId: step.id,
        stepIndex,
        stepType: stepDef.stepType,
        attempt,
        maxRetries: retryPolicy.maxRetries,
        errorCategory: classification.category,
      });

      return {
        type: 'moved_to_dlq',
      };
    }
  }

  private async moveStepToDlq(params: {
    organizationId: string;
    executionId: string;
    stepId: string;
    stepType: string;
    failureReason: string;
    errorStack?: string;
    errorCategory: string;
    attemptCount: number;
    firstFailedAt: Date;
    lastFailedAt: Date;
    inputPayload: unknown;
    stepConfigSnapshot: unknown;
    correlationId: string;
  }): Promise<void> {
    const dlqItem = await this.prisma.workflowStepDlqItem.upsert({
      where: {
        workflowStepId: params.stepId,
      },
      create: {
        organizationId: params.organizationId,
        workflowExecutionId: params.executionId,
        workflowStepId: params.stepId,
        stepType: params.stepType,
        failureReason: params.failureReason,
        errorStack: params.errorStack,
        errorCategory: params.errorCategory,
        attemptCount: params.attemptCount,
        firstFailedAt: params.firstFailedAt,
        lastFailedAt: params.lastFailedAt,
        inputPayload: redactSensitiveData(params.inputPayload) as never,
        stepConfigSnapshot: redactSensitiveData(params.stepConfigSnapshot) as never,
        correlationId: params.correlationId,
        status: 'OPEN',
      },
      update: {
        failureReason: params.failureReason,
        errorStack: params.errorStack,
        errorCategory: params.errorCategory,
        attemptCount: params.attemptCount,
        firstFailedAt: params.firstFailedAt,
        lastFailedAt: params.lastFailedAt,
        inputPayload: redactSensitiveData(params.inputPayload) as never,
        stepConfigSnapshot: redactSensitiveData(params.stepConfigSnapshot) as never,
        correlationId: params.correlationId,
        status: 'OPEN',
        replayOverride: Prisma.DbNull as never,
      },
    });

    await this.prisma.workflowExecution.update({
      where: { id: params.executionId },
      data: {
        status: WorkflowStatus.DLQ_PENDING,
        error: params.failureReason,
        completedAt: new Date(),
      },
    });

    await this.auditService.log(
      AuditAction.EXECUTE,
      'WorkflowStepDlqItem',
      dlqItem.id,
      'Workflow step moved to DLQ',
      {
        organizationId: params.organizationId,
        metadata: {
          workflowExecutionId: params.executionId,
          workflowStepId: params.stepId,
          stepType: params.stepType,
          attemptCount: params.attemptCount,
          errorCategory: params.errorCategory,
          correlationId: params.correlationId,
        },
      },
    );
  }

  private async prepareReplay(
    replay: WorkflowReplayContext,
    executionId: string,
    correlationId: string,
  ): Promise<PreparedReplayContext> {
    if (!replay.dlqItemId) {
      return {
        ...replay,
        fromStepIndex: replay.fromStepIndex ?? 0,
      };
    }

    const dlqItem = await this.prisma.workflowStepDlqItem.findUnique({
      where: { id: replay.dlqItemId },
      include: {
        workflowStep: {
          select: {
            stepIndex: true,
          },
        },
      },
    });

    if (!dlqItem) {
      throw new Error(`DLQ item ${replay.dlqItemId} not found`);
    }

    const fallbackStepIndex = dlqItem.workflowStep?.stepIndex ?? 0;
    const fromStepIndex = replay.mode === 'FROM_STEP'
      ? Math.max(0, replay.fromStepIndex ?? fallbackStepIndex)
      : fallbackStepIndex;

    if (replay.mode === 'FROM_STEP') {
      await this.prisma.workflowStep.updateMany({
        where: {
          executionId,
          stepIndex: {
            gte: fromStepIndex,
          },
        },
        data: {
          status: WorkflowStepStatus.PENDING,
          output: Prisma.DbNull as never,
          error: null,
          errorStack: null,
          nextRetryAt: null,
          startedAt: null,
          completedAt: null,
          attemptCount: 0,
          maxRetries: 0,
          firstFailedAt: null,
          lastFailedAt: null,
          correlationId,
        },
      });
    } else {
      await this.prisma.workflowStep.updateMany({
        where: {
          executionId,
          stepIndex: fallbackStepIndex,
        },
        data: {
          status: WorkflowStepStatus.PENDING,
          output: Prisma.DbNull as never,
          error: null,
          errorStack: null,
          nextRetryAt: null,
          startedAt: null,
          completedAt: null,
          attemptCount: 0,
          maxRetries: 0,
          firstFailedAt: null,
          lastFailedAt: null,
          correlationId,
        },
      });
    }

    await this.prisma.workflowExecution.update({
      where: { id: executionId },
      data: {
        status: WorkflowStatus.RUNNING,
        currentStep: fromStepIndex,
        completedAt: null,
        error: null,
      },
    });

    await this.prisma.workflowStepDlqItem.update({
      where: { id: dlqItem.id },
      data: {
        status: 'REPLAYING',
      },
    });

    return {
      ...replay,
      dlqItemId: dlqItem.id,
      fromStepIndex,
    };
  }

  private async resolveDlqItemAfterReplay(
    dlqItemId: string,
    resolvedBy: string | undefined,
    organizationId: string,
    correlationId: string,
    resolvedReason: string,
  ): Promise<void> {
    await this.prisma.workflowStepDlqItem.update({
      where: { id: dlqItemId },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
        resolvedBy,
        resolvedReason,
      },
    });

    await this.auditService.log(
      AuditAction.UPDATE,
      'WorkflowStepDlqItem',
      dlqItemId,
      'DLQ item resolved after replay',
      {
        organizationId,
        userId: resolvedBy,
        metadata: {
          correlationId,
          resolvedReason,
        },
      },
    );
  }

  private async recordReplayOutcome(
    dlqItemId: string,
    organizationId: string,
    userId: string | undefined,
    result: 'success' | 'failed',
    correlationId: string,
  ): Promise<void> {
    this.metrics.incrementWorkflowDlqReplay(result, organizationId);

    await this.auditService.log(
      AuditAction.EXECUTE,
      'WorkflowStepDlqReplay',
      dlqItemId,
      `DLQ replay ${result}`,
      {
        organizationId,
        userId,
        metadata: {
          result,
          correlationId,
        },
      },
    );
  }
  private resolveStartIndex(
    currentStep: number,
    stepCount: number,
    jobPayload: WorkflowJobPayload,
    replay?: PreparedReplayContext,
  ): number {
    if (stepCount <= 0) {
      return 0;
    }

    if (replay) {
      return Math.max(0, Math.min(replay.fromStepIndex, stepCount - 1));
    }

    if (Number.isFinite(jobPayload.retryStepIndex)) {
      return Math.max(0, Math.min(jobPayload.retryStepIndex as number, stepCount - 1));
    }

    return Math.max(0, Math.min(currentStep, stepCount - 1));
  }

  private async resolveCurrentOutput(
    executionId: string,
    initialInput: unknown,
    upToStepIndex: number,
  ): Promise<unknown> {
    if (upToStepIndex <= 0) {
      return initialInput;
    }

    const previousSteps = await this.prisma.workflowStep.findMany({
      where: {
        executionId,
        stepIndex: {
          lt: upToStepIndex,
        },
      },
      orderBy: {
        stepIndex: 'asc',
      },
      select: {
        status: true,
        output: true,
      },
    });

    let currentOutput = initialInput;
    for (const step of previousSteps) {
      if (step.status === WorkflowStepStatus.SUCCESS && step.output !== null) {
        currentOutput = step.output;
      }
    }

    return currentOutput;
  }

  private async executeStep(
    stepDef: WorkflowStepDefinition,
    input: unknown,
    organizationId: string,
    executionId: string,
    stepIndex: number,
  ): Promise<unknown> {
    switch (stepDef.stepType) {
      case 'ai_process':
        return this.executeAIStep(stepDef, input, organizationId);
      case 'send_message':
      case 'messaging':
        return this.executeMessageStep(stepDef, input, organizationId, executionId, stepIndex);
      case 'update_record':
      case 'db_write':
        return this.executeUpdateStep(stepDef, input);
      case 'wait':
        return this.executeWaitStep(stepDef, input);
      case 'approval':
        return this.executeApprovalStep(stepDef, input);
      default:
        throw new Error(`Unknown step type: ${stepDef.stepType}`);
    }
  }

  private async executeAIStep(
    stepDef: WorkflowStepDefinition,
    input: unknown,
    organizationId: string,
  ): Promise<unknown> {
    const inputRecord = this.asRecord(input);
    const promptTemplate = this.getOptionalString(stepDef.config.prompt) || '';
    const prompt = this.interpolateTemplate(promptTemplate, inputRecord);

    const aiRequest = await this.aiService.processRequest({
      type: this.resolveAIRequestType(stepDef.config.aiType),
      prompt,
      context: inputRecord,
      organizationId,
    });

    return {
      ...inputRecord,
      aiResult: aiRequest.response,
      aiConfidence: aiRequest.confidence,
    };
  }

  private async executeMessageStep(
    stepDef: WorkflowStepDefinition,
    input: unknown,
    organizationId: string,
    executionId: string,
    stepIndex: number,
  ): Promise<unknown> {
    const inputRecord = this.asRecord(input);
    const toTemplate = this.getOptionalString(stepDef.config.to) || '';
    const contentTemplate = this.getOptionalString(stepDef.config.content) || '';
    const channel = this.getOptionalString(stepDef.config.channel);

    if (!channel) {
      throw new Error('send_message step requires a valid channel in config.channel');
    }

    await this.communicationService.sendMessage({
      organizationId,
      channel: channel as never,
      to: this.interpolateTemplate(toTemplate, inputRecord),
      content: this.interpolateTemplate(contentTemplate, inputRecord),
      language: this.getOptionalString(stepDef.config.language) || 'en',
      idempotencyKey: `wf:${executionId}:step:${stepIndex}`,
    });

    return inputRecord;
  }

  private async executeUpdateStep(stepDef: WorkflowStepDefinition, input: unknown): Promise<unknown> {
    const inputRecord = this.asRecord(input);
    const updates = this.asRecord(stepDef.config.updates);
    return { ...inputRecord, ...updates };
  }

  private async executeWaitStep(stepDef: WorkflowStepDefinition, input: unknown): Promise<unknown> {
    const duration = this.getNumber(stepDef.config.duration) || 0;
    await this.sleep(duration);
    return input;
  }

  private async executeApprovalStep(
    stepDef: WorkflowStepDefinition,
    input: unknown,
  ): Promise<unknown> {
    const inputRecord = this.asRecord(input);
    return {
      ...inputRecord,
      requiresApproval: true,
      approvalMessage: this.getOptionalString(stepDef.config.message) || 'Approval required',
    };
  }
  private interpolateTemplate(template: string, data: Record<string, unknown>): string {
    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
      const value = this.getNestedValue(data, path);
      return value !== undefined ? String(value) : match;
    });
  }

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce<unknown>((current, key) => {
      if (typeof current !== 'object' || current === null) {
        return undefined;
      }
      return (current as Record<string, unknown>)[key];
    }, obj);
  }

  private parseWorkflowSteps(value: unknown): WorkflowStepDefinition[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((entry) => this.normalizeStep(entry))
      .filter((entry): entry is WorkflowStepDefinition => entry !== undefined);
  }

  private normalizeStep(value: unknown): WorkflowStepDefinition | undefined {
    if (typeof value !== 'object' || value === null) {
      return undefined;
    }

    const record = value as Record<string, unknown>;
    const stepType = this.getOptionalString(record.stepType);
    if (!stepType) {
      return undefined;
    }

    const retryPolicy = this.asRecord(record.retryPolicy);

    return {
      stepType,
      config: this.asRecord(record.config),
      name: this.getOptionalString(record.name),
      retryPolicy: Object.keys(retryPolicy).length > 0 ? (retryPolicy as WorkflowRetryPolicyOverrides) : undefined,
    };
  }

  private asRecord(value: unknown): Record<string, unknown> {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return {};
  }

  private getOptionalString(value: unknown): string | undefined {
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
    return undefined;
  }

  private getNumber(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
    return undefined;
  }

  private resolveAIRequestType(value: unknown): AIRequestType {
    if (typeof value === 'string') {
      const normalized = value.trim() as AIRequestType;
      if ((Object.values(AIRequestType) as string[]).includes(normalized)) {
        return normalized;
      }
    }

    return AIRequestType.TEXT_UNDERSTANDING;
  }

  private async updateActiveWorkflowGauge(organizationId: string): Promise<void> {
    const activeRuns = await this.prisma.workflowExecution.count({
      where: {
        organizationId,
        status: WorkflowStatus.RUNNING,
      },
    });
    this.metrics.setActiveWorkflowRuns(organizationId, activeRuns);
  }

  private async updateQueueDepthMetric(): Promise<void> {
    const counts = await this.workflowQueue.getJobCounts('waiting');
    this.metrics.setQueueDepth('workflows', counts.waiting || 0);
  }

  private resolveCorrelationId(correlationId?: string): string {
    if (correlationId && correlationId.length > 0) {
      return correlationId;
    }
    return this.correlationContext.getCorrelationId() || `req_${randomUUID()}`;
  }

  private async sleep(durationMs: number): Promise<void> {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, durationMs);
    });
  }
}
