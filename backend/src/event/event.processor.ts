import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { CorrelationContextService } from '../common/context/correlation-context.service';
import { AppLoggerService } from '../common/logger/app-logger.service';
import { WorkflowMetrics } from '../common/metrics/workflow.metrics';
import { EventService } from './event.service';

interface EventJobPayload {
  eventId: string;
  organizationId: string;
  correlationId?: string;
}

@Injectable()
@Processor('events')
export class EventProcessor extends WorkerHost {
  constructor(
    private readonly eventService: EventService,
    private readonly logger: AppLoggerService,
    private readonly metrics: WorkflowMetrics,
    private readonly correlationContext: CorrelationContextService,
    @InjectQueue('events') private readonly eventQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<EventJobPayload>): Promise<void> {
    const correlationId = job.data.correlationId || `evt_${job.data.eventId}`;
    return this.correlationContext.runWithContext(
      {
        correlationId,
        organizationId: job.data.organizationId,
      },
      async () => {
        this.logger.info('Processing event ingestion job', {
          service: 'event-processor',
          eventId: job.data.eventId,
          organizationId: job.data.organizationId,
          jobId: String(job.id),
          attempt: job.attemptsMade + 1,
        });

        try {
          await this.eventService.processIngestion(job.data.eventId, correlationId);

          this.logger.info('Event ingestion job completed', {
            service: 'event-processor',
            eventId: job.data.eventId,
            organizationId: job.data.organizationId,
            jobId: String(job.id),
          });
        } catch (error) {
          this.logger.error('Event ingestion job failed', error, {
            service: 'event-processor',
            eventId: job.data.eventId,
            organizationId: job.data.organizationId,
            jobId: String(job.id),
            attempt: job.attemptsMade + 1,
          });
          throw error;
        } finally {
          const counts = await this.eventQueue.getJobCounts('waiting');
          this.metrics.setQueueDepth('events', counts.waiting || 0);
        }
      },
    );
  }
}
