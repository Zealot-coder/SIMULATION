import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as Sentry from '@sentry/node';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateEventDto } from './dto/create-event.dto';
import { WorkflowService } from '../workflow/workflow.service';
import { PrismaService } from '../prisma/prisma.service';
import { AppLoggerService } from '../common/logger/app-logger.service';
import { WorkflowMetrics } from '../common/metrics/workflow.metrics';
import { CorrelationContextService } from '../common/context/correlation-context.service';

@Injectable()
export class EventService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    @Inject(forwardRef(() => WorkflowService))
    private readonly workflowService: WorkflowService,
    private readonly logger: AppLoggerService,
    private readonly metrics: WorkflowMetrics,
    private readonly correlationContext: CorrelationContextService,
    @InjectQueue('events') private readonly eventQueue: Queue,
  ) {}

  async create(organizationId: string, dto: CreateEventDto) {
    const correlationId = this.correlationContext.getCorrelationId();
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

    this.metrics.incrementEventIngested(event.type, organizationId);
    this.eventEmitter.emit('event.created', {
      event,
      organizationId,
    });

    await this.eventQueue.add(
      'ingest-event',
      {
        eventId: event.id,
        organizationId,
        correlationId,
      },
      {
        jobId: event.id,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    );

    const counts = await this.eventQueue.getJobCounts('waiting');
    this.metrics.setQueueDepth('events', counts.waiting || 0);

    this.logger.info('Event created and queued for ingestion', {
      service: 'event-ingestion',
      eventId: event.id,
      eventType: event.type,
      organizationId,
      source: event.source,
      queue: 'events',
    });

    return event;
  }

  async processIngestion(eventId: string, correlationId?: string): Promise<void> {
    return this.correlationContext.runWithContext(
      {
        correlationId: correlationId || this.correlationContext.getCorrelationId() || `evt_${eventId}`,
      },
      async () => {
        const event = await this.prisma.event.findUnique({
          where: { id: eventId },
        });

        if (!event) {
          this.logger.warn('Event ingestion skipped because event was not found', {
            service: 'event-ingestion',
            eventId,
          });
          return;
        }

        this.correlationContext.setOrganizationId(event.organizationId);
        this.logger.info('Event ingestion started', {
          service: 'event-ingestion',
          eventId: event.id,
          eventType: event.type,
          organizationId: event.organizationId,
        });

        try {
          const matchedWorkflows = await this.workflowService.triggerWorkflowsForEvent(
            event.organizationId,
            {
              id: event.id,
              type: event.type,
              payload: event.payload,
            },
            this.correlationContext.getCorrelationId(),
          );

          this.logger.info('Event ingestion completed', {
            service: 'event-ingestion',
            eventId: event.id,
            eventType: event.type,
            organizationId: event.organizationId,
            matchedWorkflows,
          });
        } catch (error) {
          Sentry.captureException(error, {
            tags: {
              service: 'event-ingestion',
              organizationId: event.organizationId,
              eventType: event.type,
            },
            extra: {
              eventId: event.id,
              correlationId: this.correlationContext.getCorrelationId(),
            },
          });

          this.logger.error('Event ingestion failed', error, {
            service: 'event-ingestion',
            eventId: event.id,
            eventType: event.type,
            organizationId: event.organizationId,
          });
          throw error;
        }
      },
    );
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
