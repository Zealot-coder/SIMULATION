import { Injectable } from '@nestjs/common';
import { WorkflowExecutionService } from './workflow-execution.service';

@Injectable()
export class WorkflowProcessor {
  constructor(private executionService: WorkflowExecutionService) {}

  // Placeholder processor: when migrating to Supabase-based jobs,
  // call `processExecution(executionId)` from whichever runner you use.
  async processExecution(executionId: string) {
    await this.executionService.executeWorkflow(executionId);
  }
}


