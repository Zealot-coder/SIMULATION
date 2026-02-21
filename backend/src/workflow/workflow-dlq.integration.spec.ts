import { Prisma, WorkflowStatus, WorkflowStepStatus } from '@prisma/client';
import { WorkflowExecutionService } from './workflow-execution.service';
import { WorkflowJobPayload } from './workflow-job-payload';

interface InMemoryStep {
  id: string;
  executionId: string;
  stepIndex: number;
  stepType: string;
  status: WorkflowStepStatus;
  config: Record<string, unknown>;
  input: unknown;
  output: unknown;
  error: string | null;
  errorStack: string | null;
  attemptCount: number;
  maxRetries: number;
  nextRetryAt: Date | null;
  firstFailedAt: Date | null;
  lastFailedAt: Date | null;
  correlationId: string | null;
  retryPolicyOverride: unknown;
  startedAt: Date | null;
  completedAt: Date | null;
}

interface InMemoryDlqItem {
  id: string;
  organizationId: string;
  workflowExecutionId: string;
  workflowStepId: string;
  stepType: string;
  failureReason: string;
  errorStack: string | null;
  errorCategory: string;
  attemptCount: number;
  firstFailedAt: Date;
  lastFailedAt: Date;
  inputPayload: unknown;
  stepConfigSnapshot: unknown;
  correlationId: string | null;
  status: 'OPEN' | 'REPLAYING' | 'RESOLVED' | 'IGNORED';
  replayOverride: unknown;
  resolvedBy: string | null;
  resolvedReason: string | null;
  resolvedAt: Date | null;
  replayCount: number;
  lastReplayAt: Date | null;
  lastReplayBy: string | null;
}

function applyUpdate<T extends Record<string, unknown>>(target: T, data: Record<string, unknown>): void {
  for (const [key, rawValue] of Object.entries(data)) {
    if (typeof rawValue === 'object' && rawValue !== null && 'increment' in rawValue) {
      const incrementBy = Number((rawValue as { increment: number }).increment);
      const current = Number(target[key] ?? 0);
      target[key as keyof T] = (current + incrementBy) as T[keyof T];
      continue;
    }

    if (rawValue === Prisma.DbNull) {
      target[key as keyof T] = null as T[keyof T];
      continue;
    }

    target[key as keyof T] = rawValue as T[keyof T];
  }
}

describe('workflow-dlq integration', () => {
  it('handles fail -> retries -> DLQ -> replay -> success', async () => {
    const executionState = {
      id: 'exec-1',
      workflowId: 'wf-1',
      organizationId: 'org-1',
      eventId: null,
      status: WorkflowStatus.PENDING,
      currentStep: 0,
      input: { customerId: 'cust-1' },
      output: null as unknown,
      error: null as string | null,
      startedAt: null as Date | null,
      completedAt: null as Date | null,
      workflow: {
        id: 'wf-1',
        steps: [
          {
            stepType: 'http_call',
            config: { endpoint: 'https://example.org' },
            retryPolicy: { maxRetries: 1 },
          },
        ],
      },
    };

    const stepState: InMemoryStep[] = [];
    const dlqState: InMemoryDlqItem[] = [];
    const queuedJobs: Array<{ name: string; payload: WorkflowJobPayload; options?: Record<string, unknown> }> = [];

    const prisma = {
      workflowExecution: {
        findUnique: jest.fn(async ({ where: { id } }: any) => {
          if (id !== executionState.id) {
            return null;
          }
          return executionState;
        }),
        update: jest.fn(async ({ where: { id }, data }: any) => {
          if (id !== executionState.id) {
            throw new Error('Execution not found');
          }
          applyUpdate(executionState as Record<string, unknown>, data as Record<string, unknown>);
          return executionState;
        }),
        count: jest.fn(async ({ where }: any) => {
          if (where.organizationId !== executionState.organizationId) {
            return 0;
          }
          return executionState.status === where.status ? 1 : 0;
        }),
      },
      workflowStep: {
        upsert: jest.fn(async ({ where, create, update }: any) => {
          const key = where.executionId_stepIndex;
          let step = stepState.find(
            (candidate) => candidate.executionId === key.executionId && candidate.stepIndex === key.stepIndex,
          );

          if (!step) {
            step = {
              id: `step-${key.stepIndex}`,
              executionId: create.executionId,
              stepIndex: create.stepIndex,
              stepType: create.stepType,
              status: create.status,
              config: create.config,
              input: create.input,
              output: null,
              error: null,
              errorStack: null,
              attemptCount: create.attemptCount ?? 0,
              maxRetries: create.maxRetries ?? 0,
              nextRetryAt: null,
              firstFailedAt: null,
              lastFailedAt: null,
              correlationId: create.correlationId ?? null,
              retryPolicyOverride:
                create.retryPolicyOverride === Prisma.DbNull ? null : (create.retryPolicyOverride ?? null),
              startedAt: null,
              completedAt: null,
            };
            stepState.push(step);
          } else {
            applyUpdate(step as unknown as Record<string, unknown>, update as Record<string, unknown>);
          }

          return { ...step };
        }),
        update: jest.fn(async ({ where: { id }, data }: any) => {
          const step = stepState.find((candidate) => candidate.id === id);
          if (!step) {
            throw new Error('Step not found');
          }

          applyUpdate(step as unknown as Record<string, unknown>, data as Record<string, unknown>);
          return { ...step };
        }),
        updateMany: jest.fn(async ({ where, data }: any) => {
          let count = 0;
          for (const step of stepState) {
            if (step.executionId !== where.executionId) {
              continue;
            }

            if (where.stepIndex?.gte !== undefined && step.stepIndex < where.stepIndex.gte) {
              continue;
            }

            if (where.stepIndex?.lt !== undefined && step.stepIndex >= where.stepIndex.lt) {
              continue;
            }

            if (where.stepIndex !== undefined && typeof where.stepIndex === 'number' && step.stepIndex !== where.stepIndex) {
              continue;
            }

            applyUpdate(step as unknown as Record<string, unknown>, data as Record<string, unknown>);
            count += 1;
          }

          return { count };
        }),
        findMany: jest.fn(async ({ where, orderBy, select }: any) => {
          let matches = stepState.filter((step) => step.executionId === where.executionId);

          if (where.stepIndex?.lt !== undefined) {
            matches = matches.filter((step) => step.stepIndex < where.stepIndex.lt);
          }

          if (orderBy?.stepIndex === 'asc') {
            matches = matches.sort((a, b) => a.stepIndex - b.stepIndex);
          }

          if (select) {
            return matches.map((step) => ({
              status: step.status,
              output: step.output,
            }));
          }

          return matches.map((step) => ({ ...step }));
        }),
      },
      workflowStepDlqItem: {
        upsert: jest.fn(async ({ where, create, update }: any) => {
          let item = dlqState.find((candidate) => candidate.workflowStepId === where.workflowStepId);

          if (!item) {
            item = {
              id: `dlq-${dlqState.length + 1}`,
              organizationId: create.organizationId,
              workflowExecutionId: create.workflowExecutionId,
              workflowStepId: create.workflowStepId,
              stepType: create.stepType,
              failureReason: create.failureReason,
              errorStack: create.errorStack ?? null,
              errorCategory: create.errorCategory,
              attemptCount: create.attemptCount,
              firstFailedAt: create.firstFailedAt,
              lastFailedAt: create.lastFailedAt,
              inputPayload: create.inputPayload,
              stepConfigSnapshot: create.stepConfigSnapshot,
              correlationId: create.correlationId ?? null,
              status: create.status,
              replayOverride: null,
              resolvedBy: null,
              resolvedReason: null,
              resolvedAt: null,
              replayCount: 0,
              lastReplayAt: null,
              lastReplayBy: null,
            };
            dlqState.push(item);
          } else {
            applyUpdate(item as unknown as Record<string, unknown>, update as Record<string, unknown>);
          }

          return { ...item };
        }),
        findUnique: jest.fn(async ({ where: { id } }: any) => {
          const item = dlqState.find((candidate) => candidate.id === id);
          if (!item) {
            return null;
          }

          const step = stepState.find((candidate) => candidate.id === item.workflowStepId);
          return {
            ...item,
            workflowStep: step ? { stepIndex: step.stepIndex } : null,
          };
        }),
        update: jest.fn(async ({ where: { id }, data }: any) => {
          const item = dlqState.find((candidate) => candidate.id === id);
          if (!item) {
            throw new Error('DLQ item not found');
          }

          applyUpdate(item as unknown as Record<string, unknown>, data as Record<string, unknown>);
          return { ...item };
        }),
      },
    };

    const queue = {
      add: jest.fn(async (name: string, payload: WorkflowJobPayload, options?: Record<string, unknown>) => {
        queuedJobs.push({ name, payload, options });
        return { id: options?.jobId ?? `${queuedJobs.length}` };
      }),
      getJobCounts: jest.fn(async () => ({ waiting: 0 })),
    };

    const logger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    const metrics = {
      incrementWorkflowRun: jest.fn(),
      observeWorkflowRunDuration: jest.fn(),
      incrementWorkflowStepAttempt: jest.fn(),
      incrementWorkflowStep: jest.fn(),
      observeWorkflowStepDuration: jest.fn(),
      incrementWorkflowStepRetry: jest.fn(),
      incrementWorkflowDlqMove: jest.fn(),
      incrementWorkflowDlqReplay: jest.fn(),
      setActiveWorkflowRuns: jest.fn(),
      setQueueDepth: jest.fn(),
    };

    const correlationContext = {
      runWithContext: jest.fn(async (_context: unknown, handler: () => Promise<void>) => handler()),
      setOrganizationId: jest.fn(),
      getCorrelationId: jest.fn(() => 'corr-default'),
    };

    const auditService = {
      log: jest.fn(async () => undefined),
    };

    const service = new WorkflowExecutionService(
      prisma as any,
      {} as any,
      {} as any,
      logger as any,
      metrics as any,
      correlationContext as any,
      auditService as any,
      queue as any,
    );

    let executeStepCalls = 0;
    jest.spyOn(service as any, 'executeStep').mockImplementation(async () => {
      executeStepCalls += 1;
      if (executeStepCalls <= 2) {
        throw new Error('503 service unavailable');
      }
      return { ok: true };
    });

    await service.executeWorkflow({ executionId: executionState.id, correlationId: 'corr-1' });

    expect(stepState[0].attemptCount).toBe(1);
    expect(stepState[0].status).toBe(WorkflowStepStatus.RETRYING);
    expect(stepState[0].nextRetryAt).toBeInstanceOf(Date);
    expect(queuedJobs).toHaveLength(1);
    expect(queuedJobs[0].payload.retryStepIndex).toBe(0);

    await service.executeWorkflow({
      executionId: executionState.id,
      correlationId: 'corr-1',
      retryStepIndex: 0,
      attempt: 1,
    });

    expect(stepState[0].attemptCount).toBe(2);
    expect(stepState[0].status).toBe(WorkflowStepStatus.DLQ);
    expect(executionState.status).toBe(WorkflowStatus.DLQ_PENDING);
    expect(dlqState).toHaveLength(1);
    expect(dlqState[0].failureReason).toContain('503');
    expect(dlqState[0].attemptCount).toBe(2);
    expect(dlqState[0].inputPayload).toEqual({ customerId: 'cust-1' });

    await service.executeWorkflow({
      executionId: executionState.id,
      correlationId: 'corr-replay',
      replay: {
        mode: 'FROM_STEP',
        fromStepIndex: 0,
        dlqItemId: dlqState[0].id,
        overrideRetryPolicy: {
          maxRetries: 3,
        },
        requestedByUserId: 'user-1',
      },
    });

    expect(executionState.status).toBe(WorkflowStatus.SUCCESS);
    expect(stepState[0].status).toBe(WorkflowStepStatus.SUCCESS);
    expect(dlqState[0].status).toBe('RESOLVED');
    expect(metrics.incrementWorkflowDlqReplay).toHaveBeenCalledWith('success', 'org-1');

    const auditDescriptions = (auditService.log as jest.Mock).mock.calls.map((call) => call[3]);
    expect(auditDescriptions).toContain('Workflow step moved to DLQ');
    expect(auditDescriptions).toContain('DLQ item resolved after replay');
    expect(auditDescriptions).toContain('DLQ replay success');
  });
});
