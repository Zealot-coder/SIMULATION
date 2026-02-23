import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { GovernanceErrorCode } from '../governance/governance-error-codes';

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

describe('WorkflowService tenant scoping', () => {
  it('filters workflow lookup by organizationId and throws when not found', async () => {
    const prisma = {
      workflow: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };

    const service = new WorkflowService(
      prisma as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );

    await expect(service.findOne('wf-1', 'org-1')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.workflow.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'wf-1',
        organizationId: 'org-1',
      },
      include: {
        executions: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  });

  it('rejects workflow creation when plan step cap is exceeded', async () => {
    const prisma = {
      workflow: {
        create: jest.fn(),
      },
    };
    const governanceService = {
      validateWorkflowDefinition: jest.fn(async () => {
        throw new BadRequestException({
          code: GovernanceErrorCode.MAX_STEPS_EXCEEDED,
          message: 'Step cap exceeded',
        });
      }),
    };

    const service = new WorkflowService(
      prisma as any,
      {} as any,
      {} as any,
      governanceService as any,
      { log: jest.fn() } as any,
    );

    const dto = {
      name: 'Too many steps',
      steps: Array.from({ length: 101 }, () => ({ stepType: 'ai_process', config: {} })),
    } as any;

    await expect(service.create('org-1', dto, 'user-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(governanceService.validateWorkflowDefinition).toHaveBeenCalled();
    expect(prisma.workflow.create).not.toHaveBeenCalled();
  });
});
