import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WorkflowService } from '../workflow/workflow.service';

@Injectable()
export class EventService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    @Inject(forwardRef(() => WorkflowService))
    private workflowService: WorkflowService,
  ) {}

  async create(organizationId: string, dto: CreateEventDto) {
    // Create event record
    const event = await this.prisma.event.create({
      data: {
        organizationId,
        type: dto.type,
        name: dto.name,
        payload: dto.payload,
        source: dto.source,
        metadata: dto.metadata,
      },
    });

    // Emit event for workflow engine
    this.eventEmitter.emit('event.created', {
      event,
      organizationId,
    });

    // Trigger workflows that match this event type
    await this.workflowService.triggerWorkflowsForEvent(organizationId, event);

    return event;
  }

  async findByOrganization(organizationId: string, limit = 50) {
    return this.prisma.event.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async findOne(id: string) {
    return this.prisma.event.findUnique({
      where: { id },
      include: {
        triggeredWorkflows: {
          include: {
            workflow: true,
          },
        },
      },
    });
  }
}

