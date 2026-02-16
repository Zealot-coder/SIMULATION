import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { AIRequestType, WorkflowStatus, WorkflowStepStatus } from '@prisma/client';
import { Queue } from 'bullmq';
import * as Sentry from '@sentry/node';
import { randomUUID } from 'node:crypto';
import { CorrelationContextService } from '../common/context/correlation-context.service';
import { AppLoggerService } from '../common/logger/app-logger.service';
import { WorkflowMetrics } from '../common/metrics/workflow.metrics';
import { CommunicationService } from '../communication/communication.service';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';

interface WorkflowStepDefinition {
  stepType: string;
  config: Record<string, unknown>;
  name?: string;
}

@Injectable()
export class WorkflowExecutionService {
  private readonly maxStepAttempts = 3;
  private readonly baseStepBackoffMs = 1000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly communicationService: CommunicationService,
    private readonly logger: AppLoggerService,
    private readonly metrics: WorkflowMetrics,
    private readonly correlationContext: CorrelationContextService,
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
          },
          {
            jobId: execution.id,
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
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

  async executeWorkflow(executionId: string, correlationId?: string): Promise<void> {
    const resolvedCorrelationId = this.resolveCorrelationId(correlationId);
    return this.correlationContext.runWithContext(
      {
        correlationId: resolvedCorrelationId,
      },
      async () => {
        await this.executeWorkflowInternal(executionId, resolvedCorrelationId);
      },
    );
  }

  private async executeWorkflowInternal(executionId: string, correlationId: string): Promise<void> {
    const execution = await this.prisma.workflowExecution.findUnique({
      where: { id: executionId },
      include: {
        workflow: true,
      },
    });

    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
    }

    if (execution.status !== WorkflowStatus.PENDING) {
      this.logger.info('Workflow execution skipped because status is not pending', {
        service: 'workflow-execution',
        executionId,
        workflowId: execution.workflowId,
        organizationId: execution.organizationId,
        status: execution.status,
      });
      return;
    }

    this.correlationContext.setOrganizationId(execution.organizationId);

    const workflowStart = Date.now();
    const steps = this.parseWorkflowSteps(execution.workflow.steps);
    let currentOutput: unknown = execution.input;

    await this.prisma.workflowExecution.update({
      where: { id: execution.id },
      data: {
        status: WorkflowStatus.RUNNING,
        startedAt: new Date(),
      },
    });
    this.metrics.incrementWorkflowRun(execution.workflowId, execution.organizationId, 'RUNNING');
    await this.updateActiveWorkflowGauge(execution.organizationId);

    this.logger.info('Workflow execution started', {
      service: 'workflow-execution',
      executionId,
      workflowId: execution.workflowId,
      organizationId: execution.organizationId,
      stepCount: steps.length,
      correlationId,
    });

    try {
      for (let index = 0; index < steps.length; index += 1) {
        const stepDef = steps[index];
        const stepStartedAt = Date.now();

        const step = await this.prisma.workflowStep.create({
          data: {
            executionId: execution.id,
            stepIndex: index,
            stepType: stepDef.stepType,
            config: stepDef.config as never,
            input: currentOutput as never,
            status: WorkflowStepStatus.RUNNING,
            startedAt: new Date(),
          },
        });

        this.metrics.incrementWorkflowStep(stepDef.stepType, 'RUNNING');
        this.logger.info('Workflow step started', {
          service: 'workflow-execution',
          executionId,
          workflowId: execution.workflowId,
          organizationId: execution.organizationId,
          stepId: step.id,
          stepIndex: index,
          stepType: stepDef.stepType,
        });

        try {
          const stepOutput = await this.executeStepWithRetry(
            stepDef,
            currentOutput,
            execution.organizationId,
            execution.id,
            index,
          );

          await this.prisma.workflowStep.update({
            where: { id: step.id },
            data: {
              status: WorkflowStepStatus.COMPLETED,
              output: stepOutput as never,
              completedAt: new Date(),
            },
          });

          const stepDurationSeconds = (Date.now() - stepStartedAt) / 1000;
          this.metrics.observeWorkflowStepDuration(stepDef.stepType, stepDurationSeconds);
          this.metrics.incrementWorkflowStep(stepDef.stepType, 'COMPLETED');

          this.logger.info('Workflow step completed', {
            service: 'workflow-execution',
            executionId,
            workflowId: execution.workflowId,
            organizationId: execution.organizationId,
            stepId: step.id,
            stepIndex: index,
            stepType: stepDef.stepType,
            durationSeconds: stepDurationSeconds,
          });

          currentOutput = stepOutput;
        } catch (error) {
          const stepDurationSeconds = (Date.now() - stepStartedAt) / 1000;
          const message = this.getErrorMessage(error);

          await this.prisma.workflowStep.update({
            where: { id: step.id },
            data: {
              status: WorkflowStepStatus.FAILED,
              error: message,
              completedAt: new Date(),
            },
          });

          this.metrics.observeWorkflowStepDuration(stepDef.stepType, stepDurationSeconds);
          this.metrics.incrementWorkflowStep(stepDef.stepType, 'FAILED');

          Sentry.captureException(error, {
            tags: {
              service: 'workflow-execution',
              workflowId: execution.workflowId,
              organizationId: execution.organizationId,
              stepType: stepDef.stepType,
            },
            extra: {
              executionId: execution.id,
              stepIndex: index,
              stepId: step.id,
              correlationId,
            },
          });

          this.logger.error('Workflow step failed', error, {
            service: 'workflow-execution',
            executionId: execution.id,
            workflowId: execution.workflowId,
            organizationId: execution.organizationId,
            stepId: step.id,
            stepIndex: index,
            stepType: stepDef.stepType,
            durationSeconds: stepDurationSeconds,
          });

          throw error;
        }
      }

      const workflowDurationSeconds = (Date.now() - workflowStart) / 1000;
      await this.prisma.workflowExecution.update({
        where: { id: execution.id },
        data: {
          status: WorkflowStatus.COMPLETED,
          output: currentOutput as never,
          completedAt: new Date(),
        },
      });
      this.metrics.incrementWorkflowRun(execution.workflowId, execution.organizationId, 'COMPLETED');
      this.metrics.observeWorkflowRunDuration(execution.workflowId, workflowDurationSeconds);

      this.logger.info('Workflow execution completed', {
        service: 'workflow-execution',
        executionId: execution.id,
        workflowId: execution.workflowId,
        organizationId: execution.organizationId,
        durationSeconds: workflowDurationSeconds,
      });
    } catch (error) {
      const message = this.getErrorMessage(error);

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

  private async executeStepWithRetry(
    stepDef: WorkflowStepDefinition,
    input: unknown,
    organizationId: string,
    executionId: string,
    stepIndex: number,
  ): Promise<unknown> {
    for (let attempt = 1; attempt <= this.maxStepAttempts; attempt += 1) {
      try {
        return await this.executeStep(stepDef, input, organizationId);
      } catch (error) {
        const retryable = this.isRetryableError(error);
        const remainingAttempts = this.maxStepAttempts - attempt;

        if (!retryable || remainingAttempts <= 0) {
          throw error;
        }

        const delayMs = this.baseStepBackoffMs * 2 ** (attempt - 1);
        this.logger.warn('Workflow step failed with retryable error; retrying', {
          service: 'workflow-execution',
          executionId,
          organizationId,
          stepIndex,
          stepType: stepDef.stepType,
          attempt,
          remainingAttempts,
          delayMs,
          error: this.getErrorMessage(error),
        });

        await this.sleep(delayMs);
      }
    }

    throw new Error('Workflow step retry exhausted unexpectedly');
  }

  private async executeStep(
    stepDef: WorkflowStepDefinition,
    input: unknown,
    organizationId: string,
  ): Promise<unknown> {
    switch (stepDef.stepType) {
      case 'ai_process':
        return this.executeAIStep(stepDef, input, organizationId);
      case 'send_message':
        return this.executeMessageStep(stepDef, input, organizationId);
      case 'update_record':
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

    return {
      stepType,
      config: this.asRecord(record.config),
      name: this.getOptionalString(record.name),
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

  private isRetryableError(error: unknown): boolean {
    const message = this.getErrorMessage(error).toLowerCase();
    return (
      message.includes('timeout') ||
      message.includes('timed out') ||
      message.includes('econnreset') ||
      message.includes('econnrefused') ||
      message.includes('enotfound') ||
      message.includes('network') ||
      message.includes('rate limit') ||
      message.includes('429') ||
      message.includes('503') ||
      message.includes('502') ||
      message.includes('504')
    );
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return typeof error === 'string' ? error : 'Unknown error';
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
