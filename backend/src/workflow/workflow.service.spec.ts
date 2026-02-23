import { NotFoundException } from '@nestjs/common';
import { WorkflowService } from './workflow.service';

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
});
