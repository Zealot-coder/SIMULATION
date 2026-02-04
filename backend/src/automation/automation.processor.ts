import { Injectable } from '@nestjs/common';
import { AutomationService } from './automation.service';

@Injectable()
export class AutomationProcessor {
  constructor(private automationService: AutomationService) {}

  // Placeholder processor for migration away from Bull. Call
  // `processAutomation(jobId)` from your chosen runner when ready.
  async processAutomation(jobId: string) {
    await this.automationService.processJob(jobId);
  }
}


