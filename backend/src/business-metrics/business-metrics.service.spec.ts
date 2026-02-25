import { WorkflowStatus } from '@prisma/client';
import { BusinessMetricsService } from './business-metrics.service';

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

describe('BusinessMetricsService', () => {
  function createService() {
    const tx = {
      organizationHourlyMetric: {
        upsert: jest.fn(async () => undefined),
      },
      organizationDailyMetric: {
        upsert: jest.fn(async () => undefined),
      },
    };

    const prisma = {
      $transaction: jest.fn(async (handler: (client: typeof tx) => Promise<void>) => handler(tx)),
      organizationHourlyMetric: {
        findMany: jest.fn(async () => []),
      },
      organizationDailyMetric: {
        findMany: jest.fn(async () => []),
      },
      workflowStep: {
        count: jest.fn(async () => 0),
      },
      workflowStepDlqItem: {
        count: jest.fn(async () => 0),
      },
      workflowExecution: {
        findMany: jest.fn(async () => []),
      },
      workflowSafetyViolation: {
        findMany: jest.fn(async () => []),
      },
    };

    const governanceService = {
      resolveEffectiveLimits: jest.fn(async () => ({
        planId: 'plan-1',
        planName: 'pro',
      })),
    };

    const cache = {
      getOrSet: jest.fn(async ({ resolver }: { resolver: () => Promise<unknown> }) => resolver()),
      bumpOrganizationCacheVersion: jest.fn(async () => undefined),
    };

    const logger = {
      warn: jest.fn(),
    };

    const service = new BusinessMetricsService(
      prisma as any,
      governanceService as any,
      cache as any,
      logger as any,
    );

    return {
      service,
      prisma,
      tx,
      governanceService,
      cache,
    };
  }

  it('records workflow outcome into hourly and daily aggregates', async () => {
    const { service, tx, cache } = createService();
    const startedAt = new Date('2026-02-25T08:00:00.000Z');
    const completedAt = new Date('2026-02-25T08:00:05.000Z');

    await service.recordWorkflowOutcome({
      organizationId: 'org-1',
      status: WorkflowStatus.FAILED,
      startedAt,
      completedAt,
    });

    expect(tx.organizationHourlyMetric.upsert).toHaveBeenCalled();
    expect(tx.organizationDailyMetric.upsert).toHaveBeenCalled();
    expect(tx.organizationHourlyMetric.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          workflowsTotal: { increment: 1 },
          workflowsFailed: { increment: 1 },
          totalExecutionTimeMs: { increment: BigInt(5000) },
        }),
      }),
    );
    expect(cache.bumpOrganizationCacheVersion).toHaveBeenCalledWith('org-1');
  });

  it('computes summary metrics and rates from aggregate rows', async () => {
    const { service, prisma } = createService();

    (prisma.organizationHourlyMetric.findMany as jest.Mock)
      .mockResolvedValueOnce([
        {
          ordersCreated: 12,
          paymentsTotal: 10,
          paymentsSuccessful: 8,
          workflowsTotal: 10,
          workflowsFailed: 2,
          totalExecutionTimeMs: BigInt(20000),
          messagesSent: 20,
          messagesDelivered: 16,
          hourBucket: new Date('2026-02-25T09:00:00.000Z'),
        },
      ])
      .mockResolvedValueOnce([
        {
          ordersCreated: 10,
          paymentsTotal: 8,
          paymentsSuccessful: 8,
          workflowsTotal: 8,
          workflowsFailed: 1,
          totalExecutionTimeMs: BigInt(12000),
          messagesSent: 15,
          messagesDelivered: 15,
          hourBucket: new Date('2026-02-24T09:00:00.000Z'),
        },
      ]);

    const result = await service.getSummary({
      organizationId: 'org-1',
      from: new Date('2026-02-25T00:00:00.000Z'),
      to: new Date('2026-02-25T23:59:59.000Z'),
    });

    const payment = result.kpis.find((metric: any) => metric.key === 'payment_success_rate');
    const failure = result.kpis.find((metric: any) => metric.key === 'workflow_failure_rate');
    const delivery = result.kpis.find((metric: any) => metric.key === 'message_delivery_rate');

    expect(payment?.value).toBe(80);
    expect(failure?.value).toBe(20);
    expect(delivery?.value).toBe(80);
    expect(result.plan.name).toBe('pro');
  });

  it('returns workflow failure rate of 20% for 10 workflows with 2 failures', async () => {
    const { service, prisma } = createService();

    (prisma.organizationHourlyMetric.findMany as jest.Mock)
      .mockResolvedValueOnce([
        {
          ordersCreated: 0,
          paymentsTotal: 0,
          paymentsSuccessful: 0,
          workflowsTotal: 10,
          workflowsFailed: 2,
          totalExecutionTimeMs: BigInt(10000),
          messagesSent: 0,
          messagesDelivered: 0,
          hourBucket: new Date('2026-02-25T09:00:00.000Z'),
        },
      ])
      .mockResolvedValueOnce([
        {
          ordersCreated: 0,
          paymentsTotal: 0,
          paymentsSuccessful: 0,
          workflowsTotal: 8,
          workflowsFailed: 1,
          totalExecutionTimeMs: BigInt(7000),
          messagesSent: 0,
          messagesDelivered: 0,
          hourBucket: new Date('2026-02-24T09:00:00.000Z'),
        },
      ]);
    (prisma.workflowStep.count as jest.Mock).mockResolvedValue(3);
    (prisma.workflowStepDlqItem.count as jest.Mock).mockResolvedValue(1);
    (prisma.workflowExecution.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.workflowSafetyViolation.findMany as jest.Mock).mockResolvedValue([]);

    const result = await service.getWorkflowHealth({
      organizationId: 'org-1',
      from: new Date('2026-02-25T00:00:00.000Z'),
      to: new Date('2026-02-25T23:59:59.000Z'),
    });

    expect(result.summary.failureRate).toBe(20);
    expect(result.summary.workflowsTotal).toBe(10);
    expect(result.summary.workflowsFailed).toBe(2);
  });

  it('keeps organization isolation in trend query filters', async () => {
    const { service, prisma } = createService();

    await service.getTrends({
      organizationId: 'org-a',
      from: new Date('2026-02-25T00:00:00.000Z'),
      to: new Date('2026-02-25T05:00:00.000Z'),
      granularity: 'hour',
    });

    expect(prisma.organizationHourlyMetric.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: 'org-a',
        }),
      }),
    );
  });
});
