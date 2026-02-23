import { WorkflowStatus } from '@prisma/client';
import { GovernanceErrorCode } from '../governance/governance-error-codes';
import { WorkflowExecutionService } from './workflow-execution.service';

jest.mock('@sentry/node', () => ({
  captureException: jest.fn(),
}), { virtual: true });
jest.mock('nest-winston', () => ({
  WINSTON_MODULE_PROVIDER: 'WINSTON_MODULE_PROVIDER',
}), { virtual: true });
jest.mock('winston', () => ({}), { virtual: true });
jest.mock('@willsoto/nestjs-prometheus', () => ({
  InjectMetric: () => () => undefined,
}), { virtual: true });
jest.mock('prom-client', () => ({
  Counter: class {},
  Gauge: class {},
  Histogram: class {},
}), { virtual: true });

function applyUpdate<T extends Record<string, unknown>>(target: T, data: Record<string, unknown>): void {
  for (const [key, rawValue] of Object.entries(data)) {
    if (typeof rawValue === 'object' && rawValue !== null && 'increment' in rawValue) {
      const incrementBy = Number((rawValue as { increment: number }).increment);
      const current = Number(target[key] ?? 0);
      target[key as keyof T] = (current + incrementBy) as T[keyof T];
      continue;
    }

    if (typeof rawValue === 'object' && rawValue !== null && 'decrement' in rawValue) {
      const decrementBy = Number((rawValue as { decrement: number }).decrement);
      const current = Number(target[key] ?? 0);
      target[key as keyof T] = Math.max(0, current - decrementBy) as T[keyof T];
      continue;
    }

    target[key as keyof T] = rawValue as T[keyof T];
  }
}

describe('workflow safety guards', () => {
  function createHarness(options?: {
    maxExecutionTimeMs?: number;
    maxStepIterations?: number;
    concurrentSlot?: { acquired: boolean; limit: number; current: number; retryDelayMs: number };
    startedAt?: Date | null;
  }) {
    const executionState = {
      id: 'exec-1',
      workflowId: 'wf-1',
      organizationId: 'org-1',
      eventId: null as string | null,
      status: WorkflowStatus.PENDING,
      currentStep: 0,
      iterationCount: 0,
      concurrencySlotHeld: false,
      safetyLimitCode: null as string | null,
      input: { amount: 100 },
      output: null as unknown,
      error: null as string | null,
      startedAt: options?.startedAt ?? null,
      completedAt: null as Date | null,
      createdAt: new Date(),
      workflow: {
        id: 'wf-1',
        steps: [
          {
            stepType: 'send_message',
            config: {
              to: '{{phone}}',
              content: 'hello',
              channel: 'WHATSAPP',
            },
          },
        ],
      },
    };

    const prisma = {
      workflowExecution: {
        findUnique: jest.fn(async () => executionState),
        update: jest.fn(async ({ data }: any) => {
          applyUpdate(executionState as unknown as Record<string, unknown>, data as Record<string, unknown>);
          return executionState;
        }),
        updateMany: jest.fn(async ({ where, data }: any) => {
          if (where.id !== executionState.id) {
            return { count: 0 };
          }
          if (
            where.concurrencySlotHeld !== undefined &&
            executionState.concurrencySlotHeld !== where.concurrencySlotHeld
          ) {
            return { count: 0 };
          }
          applyUpdate(executionState as unknown as Record<string, unknown>, data as Record<string, unknown>);
          return { count: 1 };
        }),
        count: jest.fn(async ({ where }: any) => {
          if (where.organizationId !== executionState.organizationId) {
            return 0;
          }
          return executionState.status === where.status ? 1 : 0;
        }),
      },
      workflowStep: {
        findMany: jest.fn(async () => []),
      },
    };

    const queue = {
      add: jest.fn(async () => ({ id: 'job-1' })),
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
    const workflowStepDedupService = {
      acquire: jest.fn(async () => ({ type: 'acquired', lockId: 'lock-1', inputHash: 'h1' })),
      markDone: jest.fn(async () => undefined),
      releaseLock: jest.fn(async () => undefined),
    };
    const governanceService = {
      consumeWorkflowRunQuota: jest.fn(async () => ({ allowed: true, current: 1, limit: 500 })),
      resolveEffectiveLimits: jest.fn(async () => ({
        planId: 'plan-free',
        planName: 'free',
        maxExecutionTimeMs: options?.maxExecutionTimeMs ?? 300000,
        maxStepIterations: options?.maxStepIterations ?? 1000,
        maxWorkflowSteps: 100,
        maxDailyWorkflowRuns: 500,
        maxDailyMessages: 1000,
        maxDailyAiRequests: 500,
        maxConcurrentRuns: 10,
      })),
      tryAcquireConcurrentRunSlot: jest.fn(async () => options?.concurrentSlot || {
        acquired: true,
        limit: 10,
        current: 1,
        retryDelayMs: 5000,
      }),
      releaseConcurrentRunSlot: jest.fn(async () => undefined),
      recordSafetyViolation: jest.fn(async () => undefined),
    };

    const service = new WorkflowExecutionService(
      prisma as any,
      {} as any,
      {} as any,
      workflowStepDedupService as any,
      logger as any,
      metrics as any,
      correlationContext as any,
      auditService as any,
      governanceService as any,
      queue as any,
    );

    return {
      service,
      executionState,
      queue,
      governanceService,
      metrics,
    };
  }

  it('fails execution when max execution time is breached', async () => {
    const { service, executionState, governanceService } = createHarness({
      maxExecutionTimeMs: 10,
      startedAt: new Date(Date.now() - 60_000),
    });

    await service.executeWorkflow({
      executionId: executionState.id,
      correlationId: 'corr-timeout',
    });

    expect(executionState.status).toBe(WorkflowStatus.FAILED_SAFETY_LIMIT);
    expect(executionState.safetyLimitCode).toBe(GovernanceErrorCode.WORKFLOW_TIMEOUT);
    expect(governanceService.recordSafetyViolation).toHaveBeenCalledWith(
      expect.objectContaining({
        limitCode: GovernanceErrorCode.WORKFLOW_TIMEOUT,
      }),
    );
  });

  it('fails execution when step iteration cap is breached', async () => {
    const { service, executionState, governanceService } = createHarness({
      maxStepIterations: 0,
      startedAt: new Date(),
    });

    await service.executeWorkflow({
      executionId: executionState.id,
      correlationId: 'corr-iter',
    });

    expect(executionState.status).toBe(WorkflowStatus.FAILED_SAFETY_LIMIT);
    expect(executionState.safetyLimitCode).toBe(
      GovernanceErrorCode.STEP_ITERATION_LIMIT_EXCEEDED,
    );
    expect(governanceService.recordSafetyViolation).toHaveBeenCalledWith(
      expect.objectContaining({
        limitCode: GovernanceErrorCode.STEP_ITERATION_LIMIT_EXCEEDED,
      }),
    );
  });

  it('requeues execution when concurrent run limit is reached', async () => {
    const { service, executionState, queue, governanceService } = createHarness({
      concurrentSlot: {
        acquired: false,
        limit: 1,
        current: 1,
        retryDelayMs: 3000,
      },
      startedAt: new Date(),
    });

    await service.executeWorkflow({
      executionId: executionState.id,
      correlationId: 'corr-concurrent',
    });

    expect(queue.add).toHaveBeenCalledWith(
      'execute-workflow',
      expect.objectContaining({ executionId: executionState.id }),
      expect.objectContaining({ delay: 3000 }),
    );
    expect(governanceService.recordSafetyViolation).toHaveBeenCalledWith(
      expect.objectContaining({
        limitCode: GovernanceErrorCode.CONCURRENT_LIMIT_EXCEEDED,
      }),
    );
    expect(executionState.status).toBe(WorkflowStatus.PENDING);
  });
});
