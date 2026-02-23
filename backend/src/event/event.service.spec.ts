import { NotFoundException } from '@nestjs/common';
import { EventService } from './event.service';

describe('EventService tenant scoping', () => {
  it('filters event lookup by organizationId and throws when not found', async () => {
    const prisma = {
      event: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };

    const service = new EventService(
      prisma as any,
      { emit: jest.fn() } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );

    await expect(service.findOne('evt-1', 'org-1')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.event.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'evt-1',
        organizationId: 'org-1',
      },
      include: {
        triggeredWorkflows: {
          include: {
            workflow: true,
          },
        },
      },
    });
  });
});
