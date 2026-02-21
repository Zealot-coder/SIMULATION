import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { Injectable } from '@nestjs/common';
import { CorrelationContextService } from '../common/context/correlation-context.service';
import { AppLoggerService } from '../common/logger/app-logger.service';
import { WorkflowMetrics } from '../common/metrics/workflow.metrics';
import { WorkflowExecutionService } from './workflow-execution.service';
import { WorkflowJobPayload } from './workflow-job-payload';

@Injectable()
@Processor('workflows')
export class WorkflowProcessor extends WorkerHost {
  constructor(
    private readonly executionService: WorkflowExecutionService,
    private readonly logger: AppLoggerService,
    private readonly metrics: WorkflowMetrics,
    private readonly correlationContext: CorrelationContextService,
    @InjectQueue('workflows') private readonly workflowQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<WorkflowJobPayload>): Promise<void> {
    const correlationId = job.data.correlationId;
    return this.correlationContext.runWithContext({ correlationId }, async () => {
      this.logger.info('Processing workflow job', {
        service: 'workflow-processor',
        correlationId,
        executionId: job.data.executionId,
        jobId: String(job.id),
        attempt: job.attemptsMade + 1,
      });

      try {
        await this.executionService.executeWorkflow(job.data);
        this.logger.info('Workflow job processed successfully', {
          service: 'workflow-processor',
          correlationId,
          executionId: job.data.executionId,
          jobId: String(job.id),
        });
      } catch (error) {
        this.logger.error('Workflow job failed', error, {
          service: 'workflow-processor',
          correlationId,
          executionId: job.data.executionId,
          jobId: String(job.id),
          attempt: job.attemptsMade + 1,
        });
        throw error;
      } finally {
        const counts = await this.workflowQueue.getJobCounts('waiting');
        this.metrics.setQueueDepth('workflows', counts.waiting || 0);
      }
    });
  }
}
