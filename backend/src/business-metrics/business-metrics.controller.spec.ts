import { BusinessMetricsController } from './business-metrics.controller';

jest.mock('nest-winston', () => ({
  WINSTON_MODULE_PROVIDER: 'WINSTON_MODULE_PROVIDER',
}), { virtual: true });
jest.mock('winston', () => ({}), { virtual: true });

describe('BusinessMetricsController', () => {
  it('requests org-scoped summary/trends/workflow health', async () => {
    const businessMetricsService = {
      getSummary: jest.fn(async () => ({ ok: true })),
      getTrends: jest.fn(async () => ({ ok: true })),
      getWorkflowHealth: jest.fn(async () => ({ ok: true })),
    };

    const controller = new BusinessMetricsController(businessMetricsService as any);

    await controller.getSummary(
      { id: 'org-1' },
      { from: '2026-02-25T00:00:00.000Z', to: '2026-02-25T10:00:00.000Z' } as any,
    );
    await controller.getTrends(
      { id: 'org-1' },
      {
        from: '2026-02-25T00:00:00.000Z',
        to: '2026-02-25T10:00:00.000Z',
        granularity: 'hour',
      } as any,
    );
    await controller.getWorkflowHealth(
      { id: 'org-1' },
      {
        from: '2026-02-25T00:00:00.000Z',
        to: '2026-02-25T10:00:00.000Z',
        limit: 5,
      } as any,
    );

    expect(businessMetricsService.getSummary).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-1',
      }),
    );
    expect(businessMetricsService.getTrends).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-1',
        granularity: 'hour',
      }),
    );
    expect(businessMetricsService.getWorkflowHealth).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-1',
        limit: 5,
      }),
    );
  });
});
