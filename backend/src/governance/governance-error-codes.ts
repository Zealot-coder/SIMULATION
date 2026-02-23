export const GovernanceErrorCode = {
  PLAN_LIMIT_REACHED: 'PLAN_LIMIT_REACHED',
  WORKFLOW_TIMEOUT: 'WORKFLOW_TIMEOUT',
  STEP_ITERATION_LIMIT_EXCEEDED: 'STEP_ITERATION_LIMIT_EXCEEDED',
  MAX_STEPS_EXCEEDED: 'MAX_STEPS_EXCEEDED',
  CONCURRENT_LIMIT_EXCEEDED: 'CONCURRENT_LIMIT_EXCEEDED',
} as const;

export type GovernanceErrorCode =
  (typeof GovernanceErrorCode)[keyof typeof GovernanceErrorCode];

export interface GovernanceErrorPayload {
  code: GovernanceErrorCode;
  message: string;
  details?: Record<string, unknown>;
}
