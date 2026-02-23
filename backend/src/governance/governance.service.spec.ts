import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { GovernanceErrorCode } from './governance-error-codes';
import { GovernanceService } from './governance.service';

jest.mock('nest-winston', () => ({
  WINSTON_MODULE_PROVIDER: 'WINSTON_MODULE_PROVIDER',
}), { virtual: true });
jest.mock('winston', () => ({}), { virtual: true });

describe('GovernanceService', () => {
  function createService(overrides?: {
    maxDailyWorkflowRuns?: number;
    workflowRunsCount?: number;
  }) {
    const prisma = {
      organization: {
        findUnique: jest.fn(async () => ({ subscriptionTier: 'free' })),
      },
      organizationPlan: {
        findUnique: jest.fn(async () => ({
          organizationId: 'org-1',
          overrideConfig: null,
          plan: {
            id: 'plan-free',
            name: 'free',
            maxExecutionTimeMs: 300000,
            maxStepIterations: 1000,
            maxWorkflowSteps: 100,
            maxDailyWorkflowRuns: overrides?.maxDailyWorkflowRuns ?? 500,
            maxDailyMessages: 1000,
            maxDailyAiRequests: 500,
            maxConcurrentRuns: 10,
          },
        })),
        create: jest.fn(async () => ({})),
      },
      plan: {
        findFirst: jest.fn(async () => null),
        findMany: jest.fn(async () => []),
        create: jest.fn(async ({ data }: any) => ({ id: 'plan-new', ...data })),
        update: jest.fn(async ({ where, data }: any) => ({ id: where.id, ...data })),
      },
      organizationUsage: {
        findMany: jest.fn(async () => []),
        upsert: jest.fn(async () => ({
          workflowRunsCount: overrides?.workflowRunsCount ?? 0,
        })),
        update: jest.fn(async () => ({})),
      },
      workflowSafetyViolation: {
        create: jest.fn(async () => ({ id: 'sv-1' })),
        findMany: jest.fn(async () => []),
      },
      $transaction: jest.fn(async (fn: any) =>
        fn({
          organizationUsage: {
            upsert: jest.fn(async () => ({
              workflowRunsCount: overrides?.workflowRunsCount ?? 0,
            })),
            update: jest.fn(async () => ({})),
          },
        })),
    };

    const auditService = {
      log: jest.fn(async () => undefined),
    };

    const logger = {
      warn: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
    };

    const service = new GovernanceService(
      prisma as any,
      auditService as any,
      logger as any,
    );

    return { service, prisma, auditService };
  }

  it('rejects workflow definitions exceeding max workflow steps', async () => {
    const { service } = createService();
    const steps = Array.from({ length: 101 }, () => ({
      stepType: 'ai_process',
      config: {},
    }));

    let thrown: any;
    try {
      await service.validateWorkflowDefinition({
        organizationId: 'org-1',
        steps,
      });
    } catch (error) {
      thrown = error;
    }

    const payload = thrown?.getResponse?.() ?? thrown?.response;
    expect(thrown).toBeInstanceOf(BadRequestException);
    expect(payload?.code).toBe(GovernanceErrorCode.MAX_STEPS_EXCEEDED);
  });

  it('blocks workflow run quota when daily limit is reached', async () => {
    const { service } = createService({
      maxDailyWorkflowRuns: 1,
      workflowRunsCount: 1,
    });

    let thrown: any;
    try {
      await service.consumeWorkflowRunQuota('org-1');
    } catch (error) {
      thrown = error;
    }

    const payload = thrown?.getResponse?.() ?? thrown?.response;
    expect(thrown).toBeInstanceOf(ForbiddenException);
    expect(payload?.code).toBe(GovernanceErrorCode.PLAN_LIMIT_REACHED);
  });

  it('scopes organization usage reads by organization id', async () => {
    const { service, prisma } = createService();
    await service.getOrganizationUsage({
      organizationId: 'org-a',
      limit: 20,
    });

    expect(prisma.organizationUsage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: 'org-a',
        }),
      }),
    );
  });
});
