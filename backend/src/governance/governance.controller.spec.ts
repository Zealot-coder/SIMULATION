import { GovernanceController } from './governance.controller';

jest.mock('nest-winston', () => ({
  WINSTON_MODULE_PROVIDER: 'WINSTON_MODULE_PROVIDER',
}), { virtual: true });
jest.mock('winston', () => ({}), { virtual: true });

describe('GovernanceController organization scope', () => {
  it('always reads usage within current organization context', async () => {
    const governanceService = {
      getOrganizationUsage: jest.fn(async () => []),
      resolveEffectiveLimits: jest.fn(async () => ({})),
      listSafetyViolations: jest.fn(async () => []),
    };

    const controller = new GovernanceController(governanceService as any);
    await controller.getUsage({ id: 'org-a' }, '2026-02-23');

    expect(governanceService.getOrganizationUsage).toHaveBeenCalledWith({
      organizationId: 'org-a',
      date: '2026-02-23',
      limit: 1,
    });
  });
});
