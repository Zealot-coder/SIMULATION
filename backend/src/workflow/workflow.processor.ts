import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { WorkflowExecutionService } from './workflow-execution.service';

@Processor('workflow')
export class WorkflowProcessor extends WorkerHost {
  constructor(private executionService: WorkflowExecutionService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { executionId } = job.data;
    await this.executionService.executeWorkflow(executionId);
  }
}

