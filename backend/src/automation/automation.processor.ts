import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { AutomationService } from './automation.service';

@Processor('automation')
export class AutomationProcessor extends WorkerHost {
  constructor(private automationService: AutomationService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { jobId } = job.data;
    await this.automationService.processJob(jobId);
  }
}

