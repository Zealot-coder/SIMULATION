import { WorkflowRetryPolicyOverrides } from './workflow-retry-policy';

export type WorkflowReplayMode = 'STEP_ONLY' | 'FROM_STEP';

export interface WorkflowReplayContext {
  mode: WorkflowReplayMode;
  fromStepIndex?: number;
  dlqItemId?: string;
  overrideRetryPolicy?: WorkflowRetryPolicyOverrides;
  requestedByUserId?: string;
}

export interface WorkflowJobPayload {
  executionId: string;
  correlationId: string;
  retryStepIndex?: number;
  attempt?: number;
  replay?: WorkflowReplayContext;
}
