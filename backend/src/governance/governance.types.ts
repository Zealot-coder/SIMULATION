import { Plan } from '@prisma/client';

export interface EffectiveGovernanceLimits {
  planId: string;
  planName: string;
  maxExecutionTimeMs: number;
  maxStepIterations: number;
  maxWorkflowSteps: number;
  maxDailyWorkflowRuns: number;
  maxDailyMessages: number;
  maxDailyAiRequests: number;
  maxConcurrentRuns: number;
  overrideConfig?: Record<string, unknown>;
}

export interface PlanLimitFields {
  maxExecutionTimeMs: number;
  maxStepIterations: number;
  maxWorkflowSteps: number;
  maxDailyWorkflowRuns: number;
  maxDailyMessages: number;
  maxDailyAiRequests: number;
  maxConcurrentRuns: number;
}

export interface GovernanceQuotaResult {
  allowed: boolean;
  current: number;
  limit: number;
}

export type GovernancePlanInput = Omit<
  Plan,
  'id' | 'createdAt' | 'updatedAt'
>;
