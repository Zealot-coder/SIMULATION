import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AppLoggerService } from '../common/logger/app-logger.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  GovernanceErrorCode,
  GovernanceErrorPayload,
} from './governance-error-codes';
import {
  EffectiveGovernanceLimits,
  GovernancePlanInput,
  GovernanceQuotaResult,
  PlanLimitFields,
} from './governance.types';

const DEFAULT_LIMITS: PlanLimitFields = {
  maxExecutionTimeMs: 5 * 60 * 1000,
  maxStepIterations: 1000,
  maxWorkflowSteps: 100,
  maxDailyWorkflowRuns: 500,
  maxDailyMessages: 1000,
  maxDailyAiRequests: 500,
  maxConcurrentRuns: 10,
};

const LOOP_STEP_TYPES = new Set([
  'loop',
  'while',
  'foreach',
  'for_each',
  'iterate',
  'repeat',
  'batch_iterate',
]);

const LOOP_CAP_KEYS = [
  'maxIterations',
  'max_iterations',
  'iterationCap',
  'iteration_cap',
  'limit',
  'maxLoopIterations',
];

const BACK_EDGE_KEYS = [
  'jumpToStep',
  'jump_to_step',
  'jumpToStepIndex',
  'jump_to_step_index',
  'gotoStep',
  'goto_step',
  'nextStepIndex',
];

@Injectable()
export class GovernanceService {
  private readonly concurrentRequeueDelayMs = Number(
    process.env.CONCURRENT_LIMIT_REQUEUE_DELAY_MS || '5000',
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly logger: AppLoggerService,
  ) {}

  async resolveEffectiveLimits(organizationId: string): Promise<EffectiveGovernanceLimits> {
    const fallbackPlanName = await this.resolveFallbackPlanName(organizationId);

    try {
      const assignment = await this.getOrCreateOrganizationPlan(organizationId, fallbackPlanName);
      if (!assignment) {
        return this.toEffectiveLimits({
          id: 'plan_fallback',
          name: fallbackPlanName,
          ...DEFAULT_LIMITS,
        });
      }

      const merged = this.mergeLimitsWithOverride(
        this.toPlanFields({
          maxExecutionTimeMs: assignment.plan.maxExecutionTimeMs,
          maxStepIterations: assignment.plan.maxStepIterations,
          maxWorkflowSteps: assignment.plan.maxWorkflowSteps,
          maxDailyWorkflowRuns: assignment.plan.maxDailyWorkflowRuns,
          maxDailyMessages: assignment.plan.maxDailyMessages,
          maxDailyAiRequests: assignment.plan.maxDailyAiRequests,
          maxConcurrentRuns: assignment.plan.maxConcurrentRuns,
        }),
        this.asRecord(assignment.overrideConfig),
      );

      return {
        planId: assignment.plan.id,
        planName: assignment.plan.name,
        overrideConfig: this.asRecord(assignment.overrideConfig),
        ...merged,
      };
    } catch (error) {
      this.logger.warn('Falling back to in-memory governance defaults', {
        service: 'governance',
        organizationId,
        error: this.getErrorMessage(error),
      });

      return this.toEffectiveLimits({
        id: 'plan_fallback',
        name: fallbackPlanName,
        ...DEFAULT_LIMITS,
      });
    }
  }

  async validateWorkflowDefinition(params: {
    organizationId: string;
    steps: unknown;
    workflowId?: string;
    actorUserId?: string;
  }): Promise<void> {
    const limits = await this.resolveEffectiveLimits(params.organizationId);
    const steps = this.asArray(params.steps);

    if (steps.length > limits.maxWorkflowSteps) {
      const details = {
        stepCount: steps.length,
        maxWorkflowSteps: limits.maxWorkflowSteps,
      };
      await this.recordSafetyViolation({
        organizationId: params.organizationId,
        workflowId: params.workflowId,
        limitCode: GovernanceErrorCode.MAX_STEPS_EXCEEDED,
        actionTaken: 'workflow_definition_rejected',
        details,
        userId: params.actorUserId,
      });

      throw new BadRequestException(
        this.errorPayload(
          GovernanceErrorCode.MAX_STEPS_EXCEEDED,
          `Workflow has ${steps.length} steps but plan allows at most ${limits.maxWorkflowSteps}.`,
          details,
        ),
      );
    }

    for (let index = 0; index < steps.length; index += 1) {
      const step = this.asRecord(steps[index]);
      const stepType = String(step.stepType || '')
        .trim()
        .toLowerCase();
      const config = this.asRecord(step.config);
      const hasCap = this.resolveIterationCap(config) !== undefined;

      if (LOOP_STEP_TYPES.has(stepType) && !hasCap) {
        const details = {
          stepIndex: index,
          stepType,
          reason: 'loop_step_requires_iteration_cap',
        };
        await this.recordSafetyViolation({
          organizationId: params.organizationId,
          workflowId: params.workflowId,
          limitCode: GovernanceErrorCode.STEP_ITERATION_LIMIT_EXCEEDED,
          actionTaken: 'workflow_definition_rejected',
          details,
          userId: params.actorUserId,
        });

        throw new BadRequestException(
          this.errorPayload(
            GovernanceErrorCode.STEP_ITERATION_LIMIT_EXCEEDED,
            `Step ${index + 1} (${stepType}) requires an iteration cap.`,
            details,
          ),
        );
      }

      const jumpTarget = this.resolveBackEdgeTarget(config);
      if (jumpTarget !== undefined && jumpTarget <= index && !hasCap) {
        const details = {
          stepIndex: index,
          jumpTarget,
          reason: 'backward_step_jump_requires_iteration_cap',
        };
        await this.recordSafetyViolation({
          organizationId: params.organizationId,
          workflowId: params.workflowId,
          limitCode: GovernanceErrorCode.STEP_ITERATION_LIMIT_EXCEEDED,
          actionTaken: 'workflow_definition_rejected',
          details,
          userId: params.actorUserId,
        });

        throw new BadRequestException(
          this.errorPayload(
            GovernanceErrorCode.STEP_ITERATION_LIMIT_EXCEEDED,
            `Step ${index + 1} defines a backward jump without an iteration cap.`,
            details,
          ),
        );
      }
    }
  }

  async consumeWorkflowRunQuota(organizationId: string): Promise<GovernanceQuotaResult> {
    return this.consumeDailyQuota({
      organizationId,
      usageField: 'workflowRunsCount',
      limitSelector: (limits) => limits.maxDailyWorkflowRuns,
      limitCode: GovernanceErrorCode.PLAN_LIMIT_REACHED,
      message: 'Daily workflow run quota exceeded for organization plan.',
    });
  }

  async consumeDailyMessageQuota(organizationId: string): Promise<GovernanceQuotaResult> {
    return this.consumeDailyQuota({
      organizationId,
      usageField: 'messagesSentCount',
      limitSelector: (limits) => limits.maxDailyMessages,
      limitCode: GovernanceErrorCode.PLAN_LIMIT_REACHED,
      message: 'Daily outbound message quota exceeded for organization plan.',
    });
  }

  async consumeDailyAiQuota(organizationId: string): Promise<GovernanceQuotaResult> {
    return this.consumeDailyQuota({
      organizationId,
      usageField: 'aiRequestsCount',
      limitSelector: (limits) => limits.maxDailyAiRequests,
      limitCode: GovernanceErrorCode.PLAN_LIMIT_REACHED,
      message: 'Daily AI request quota exceeded for organization plan.',
    });
  }

  async tryAcquireConcurrentRunSlot(organizationId: string): Promise<{
    acquired: boolean;
    limit: number;
    current: number;
    retryDelayMs: number;
  }> {
    const limits = await this.resolveEffectiveLimits(organizationId);
    const today = this.toUtcDateOnly(new Date());
    const now = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      const usage = await tx.organizationUsage.upsert({
        where: {
          organizationId_date: {
            organizationId,
            date: today,
          },
        },
        create: {
          organizationId,
          date: today,
        },
        update: {
          updatedAt: now,
        },
      });

      const updated = await tx.organizationUsage.updateMany({
        where: {
          organizationId,
          date: today,
          concurrentRunsCurrent: {
            lt: limits.maxConcurrentRuns,
          },
        },
        data: {
          concurrentRunsCurrent: {
            increment: 1,
          },
          updatedAt: now,
        },
      });

      return {
        acquired: updated.count === 1,
        current: Number(usage.concurrentRunsCurrent),
      };
    });

    return {
      acquired: result.acquired,
      limit: limits.maxConcurrentRuns,
      current: result.acquired ? result.current + 1 : result.current,
      retryDelayMs: this.concurrentRequeueDelayMs,
    };
  }

  async releaseConcurrentRunSlot(organizationId: string): Promise<void> {
    const today = this.toUtcDateOnly(new Date());
    await this.prisma.organizationUsage.updateMany({
      where: {
        organizationId,
        date: today,
        concurrentRunsCurrent: {
          gt: 0,
        },
      },
      data: {
        concurrentRunsCurrent: {
          decrement: 1,
        },
        updatedAt: new Date(),
      },
    });
  }

  async recordSafetyViolation(params: {
    organizationId: string;
    workflowId?: string;
    workflowExecutionId?: string;
    limitCode: string;
    details?: Record<string, unknown>;
    actionTaken: string;
    userId?: string;
  }): Promise<void> {
    let violationId: string | null = null;
    try {
      const violation = await this.prisma.workflowSafetyViolation.create({
        data: {
          organizationId: params.organizationId,
          workflowId: params.workflowId,
          workflowExecutionId: params.workflowExecutionId,
          limitCode: params.limitCode,
          details: (params.details || {}) as Prisma.InputJsonValue,
          actionTaken: params.actionTaken,
        },
      });
      violationId = violation.id;
    } catch (error) {
      this.logger.warn('Failed to persist workflow safety violation entry', {
        service: 'governance',
        organizationId: params.organizationId,
        limitCode: params.limitCode,
        error: this.getErrorMessage(error),
      });
    }

    await this.auditService.log(
      AuditAction.EXECUTE,
      'WorkflowSafetyViolation',
      violationId,
      `Safety limit breached: ${params.limitCode}`,
      {
        organizationId: params.organizationId,
        userId: params.userId,
        metadata: {
          limitCode: params.limitCode,
          actionTaken: params.actionTaken,
          workflowId: params.workflowId,
          workflowExecutionId: params.workflowExecutionId,
          ...params.details,
        },
      },
    );
  }

  async listPlans() {
    return this.prisma.plan.findMany({
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async createPlan(input: Partial<GovernancePlanInput>) {
    const payload = this.normalizePlanInput(input, false);
    return this.prisma.plan.create({
      data: payload,
    });
  }

  async updatePlan(planId: string, input: Partial<GovernancePlanInput>) {
    const payload = this.normalizePlanInput(input, true);
    return this.prisma.plan.update({
      where: { id: planId },
      data: payload,
    });
  }

  async listOrganizationPlans(organizationId?: string) {
    return this.prisma.organizationPlan.findMany({
      where: organizationId ? { organizationId } : undefined,
      include: {
        plan: true,
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: {
        activatedAt: 'desc',
      },
    });
  }

  async assignOrganizationPlan(params: {
    organizationId: string;
    planId: string;
    overrideConfig?: Record<string, unknown>;
  }) {
    return this.prisma.organizationPlan.upsert({
      where: {
        organizationId: params.organizationId,
      },
      create: {
        organizationId: params.organizationId,
        planId: params.planId,
        overrideConfig: (params.overrideConfig || {}) as Prisma.InputJsonValue,
        activatedAt: new Date(),
      },
      update: {
        planId: params.planId,
        overrideConfig: (params.overrideConfig
          ? (params.overrideConfig as Prisma.InputJsonValue)
          : Prisma.DbNull) as Prisma.InputJsonValue,
        activatedAt: new Date(),
      },
      include: {
        plan: true,
      },
    });
  }

  async getOrganizationUsage(params?: {
    organizationId?: string;
    date?: string;
    from?: string;
    to?: string;
    limit?: number;
  }) {
    const date = params?.date ? this.toUtcDateOnly(new Date(params.date)) : undefined;
    const from = params?.from ? this.toUtcDateOnly(new Date(params.from)) : undefined;
    const to = params?.to ? this.toUtcDateOnly(new Date(params.to)) : undefined;
    const take = Math.max(1, Math.min(params?.limit || 100, 500));

    return this.prisma.organizationUsage.findMany({
      where: {
        ...(params?.organizationId && { organizationId: params.organizationId }),
        ...(date && { date }),
        ...(from || to
          ? {
              date: {
                ...(from && { gte: from }),
                ...(to && { lte: to }),
              },
            }
          : {}),
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: [{ date: 'desc' }, { organizationId: 'asc' }],
      take,
    });
  }

  async resetOrganizationUsage(params: {
    organizationId: string;
    date?: string;
    resetConcurrent?: boolean;
  }) {
    const date = params.date
      ? this.toUtcDateOnly(new Date(params.date))
      : this.toUtcDateOnly(new Date());

    return this.prisma.organizationUsage.upsert({
      where: {
        organizationId_date: {
          organizationId: params.organizationId,
          date,
        },
      },
      create: {
        organizationId: params.organizationId,
        date,
        workflowRunsCount: 0,
        messagesSentCount: 0,
        aiRequestsCount: 0,
        concurrentRunsCurrent: params.resetConcurrent ? 0 : 0,
      },
      update: {
        workflowRunsCount: 0,
        messagesSentCount: 0,
        aiRequestsCount: 0,
        ...(params.resetConcurrent ? { concurrentRunsCurrent: 0 } : {}),
      },
    });
  }

  async listSafetyViolations(params?: {
    organizationId?: string;
    workflowId?: string;
    workflowExecutionId?: string;
    limitCode?: string;
    from?: string;
    to?: string;
    limit?: number;
  }) {
    const from = params?.from ? new Date(params.from) : undefined;
    const to = params?.to ? new Date(params.to) : undefined;
    const take = Math.max(1, Math.min(params?.limit || 100, 500));

    return this.prisma.workflowSafetyViolation.findMany({
      where: {
        ...(params?.organizationId && { organizationId: params.organizationId }),
        ...(params?.workflowId && { workflowId: params.workflowId }),
        ...(params?.workflowExecutionId && {
          workflowExecutionId: params.workflowExecutionId,
        }),
        ...(params?.limitCode && { limitCode: params.limitCode }),
        ...(from || to
          ? {
              createdAt: {
                ...(from && { gte: from }),
                ...(to && { lte: to }),
              },
            }
          : {}),
      },
      include: {
        organization: {
          select: { id: true, name: true, slug: true },
        },
        workflow: {
          select: { id: true, name: true },
        },
        workflowExecution: {
          select: { id: true, status: true, createdAt: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take,
    });
  }

  private async consumeDailyQuota(params: {
    organizationId: string;
    usageField: 'workflowRunsCount' | 'messagesSentCount' | 'aiRequestsCount';
    limitSelector: (limits: EffectiveGovernanceLimits) => number;
    limitCode: GovernanceErrorCode;
    message: string;
  }): Promise<GovernanceQuotaResult> {
    const limits = await this.resolveEffectiveLimits(params.organizationId);
    const limit = params.limitSelector(limits);
    const today = this.toUtcDateOnly(new Date());
    const now = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      const usage = await tx.organizationUsage.upsert({
        where: {
          organizationId_date: {
            organizationId: params.organizationId,
            date: today,
          },
        },
        create: {
          organizationId: params.organizationId,
          date: today,
        },
        update: {
          updatedAt: now,
        },
      });

      const current = Number(usage[params.usageField] || 0);
      if (current >= limit) {
        return {
          allowed: false,
          current,
        };
      }

      await tx.organizationUsage.update({
        where: {
          organizationId_date: {
            organizationId: params.organizationId,
            date: today,
          },
        },
        data: {
          [params.usageField]: {
            increment: 1,
          },
          updatedAt: now,
        } as Prisma.OrganizationUsageUpdateInput,
      });

      return {
        allowed: true,
        current: current + 1,
      };
    });

    if (!result.allowed) {
      await this.recordSafetyViolation({
        organizationId: params.organizationId,
        limitCode: params.limitCode,
        actionTaken: 'request_blocked',
        details: {
          quotaType: params.usageField,
          current: result.current,
          limit,
        },
      });

      throw new ForbiddenException(
        this.errorPayload(params.limitCode, params.message, {
          quotaType: params.usageField,
          current: result.current,
          limit,
        }),
      );
    }

    return {
      allowed: true,
      current: result.current,
      limit,
    };
  }

  private async getOrCreateOrganizationPlan(
    organizationId: string,
    fallbackPlanName: string,
  ) {
    const existing = await this.prisma.organizationPlan.findUnique({
      where: { organizationId },
      include: { plan: true },
    });

    if (existing) {
      return existing;
    }

    const desiredPlan = await this.prisma.plan.findFirst({
      where: {
        name: {
          equals: fallbackPlanName,
          mode: 'insensitive',
        },
      },
    });
    const freePlan = await this.prisma.plan.findFirst({
      where: {
        name: {
          equals: 'free',
          mode: 'insensitive',
        },
      },
    });
    const selectedPlan = desiredPlan || freePlan;
    if (!selectedPlan) {
      return null;
    }

    try {
      await this.prisma.organizationPlan.create({
        data: {
          organizationId,
          planId: selectedPlan.id,
          activatedAt: new Date(),
        },
      });
    } catch (error) {
      if (!this.isUniqueConstraint(error)) {
        throw error;
      }
    }

    return this.prisma.organizationPlan.findUnique({
      where: { organizationId },
      include: { plan: true },
    });
  }

  private async resolveFallbackPlanName(organizationId: string): Promise<string> {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        subscriptionTier: true,
      },
    });

    const tier = String(organization?.subscriptionTier || 'free')
      .trim()
      .toLowerCase();
    if (tier === 'pro' || tier === 'enterprise') {
      return tier;
    }
    return 'free';
  }

  private mergeLimitsWithOverride(
    base: PlanLimitFields,
    overrideConfig: Record<string, unknown>,
  ): PlanLimitFields {
    const override = overrideConfig || {};
    return {
      maxExecutionTimeMs: this.resolveLimitValue(
        override.maxExecutionTimeMs ?? override.max_execution_time_ms,
        base.maxExecutionTimeMs,
      ),
      maxStepIterations: this.resolveLimitValue(
        override.maxStepIterations ?? override.max_step_iterations,
        base.maxStepIterations,
      ),
      maxWorkflowSteps: this.resolveLimitValue(
        override.maxWorkflowSteps ?? override.max_workflow_steps,
        base.maxWorkflowSteps,
      ),
      maxDailyWorkflowRuns: this.resolveLimitValue(
        override.maxDailyWorkflowRuns ?? override.max_daily_workflow_runs,
        base.maxDailyWorkflowRuns,
      ),
      maxDailyMessages: this.resolveLimitValue(
        override.maxDailyMessages ?? override.max_daily_messages,
        base.maxDailyMessages,
      ),
      maxDailyAiRequests: this.resolveLimitValue(
        override.maxDailyAiRequests ?? override.max_daily_ai_requests,
        base.maxDailyAiRequests,
      ),
      maxConcurrentRuns: this.resolveLimitValue(
        override.maxConcurrentRuns ?? override.max_concurrent_runs,
        base.maxConcurrentRuns,
      ),
    };
  }

  private toPlanFields(input: PlanLimitFields): PlanLimitFields {
    return {
      maxExecutionTimeMs: this.resolveLimitValue(input.maxExecutionTimeMs, DEFAULT_LIMITS.maxExecutionTimeMs),
      maxStepIterations: this.resolveLimitValue(input.maxStepIterations, DEFAULT_LIMITS.maxStepIterations),
      maxWorkflowSteps: this.resolveLimitValue(input.maxWorkflowSteps, DEFAULT_LIMITS.maxWorkflowSteps),
      maxDailyWorkflowRuns: this.resolveLimitValue(input.maxDailyWorkflowRuns, DEFAULT_LIMITS.maxDailyWorkflowRuns),
      maxDailyMessages: this.resolveLimitValue(input.maxDailyMessages, DEFAULT_LIMITS.maxDailyMessages),
      maxDailyAiRequests: this.resolveLimitValue(input.maxDailyAiRequests, DEFAULT_LIMITS.maxDailyAiRequests),
      maxConcurrentRuns: this.resolveLimitValue(input.maxConcurrentRuns, DEFAULT_LIMITS.maxConcurrentRuns),
    };
  }

  private toEffectiveLimits(input: { id: string; name: string } & PlanLimitFields): EffectiveGovernanceLimits {
    return {
      planId: input.id,
      planName: input.name,
      ...this.toPlanFields(input),
    };
  }

  private normalizePlanInput(input: Partial<GovernancePlanInput>, partial: boolean) {
    const data = this.asRecord(input);

    const normalized: Record<string, unknown> = {};
    const put = (key: keyof PlanLimitFields) => {
      if (data[key] === undefined && partial) {
        return;
      }
      normalized[key] = this.resolveLimitValue(
        data[key],
        DEFAULT_LIMITS[key],
      );
    };

    if (!partial || typeof data.name === 'string') {
      const planName = String(data.name || '')
        .trim()
        .toLowerCase();
      if (!planName) {
        throw new BadRequestException('Plan name is required');
      }
      normalized.name = planName;
    }

    put('maxExecutionTimeMs');
    put('maxStepIterations');
    put('maxWorkflowSteps');
    put('maxDailyWorkflowRuns');
    put('maxDailyMessages');
    put('maxDailyAiRequests');
    put('maxConcurrentRuns');

    return normalized as Prisma.PlanCreateInput;
  }

  private resolveLimitValue(value: unknown, fallback: number): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return Math.max(0, Math.trunc(value));
    }
    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return Math.max(0, Math.trunc(parsed));
      }
    }
    return fallback;
  }

  private resolveIterationCap(config: Record<string, unknown>): number | undefined {
    for (const key of LOOP_CAP_KEYS) {
      const value = config[key];
      if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        return Math.trunc(value);
      }
      if (typeof value === 'string' && value.trim().length > 0) {
        const parsed = Number(value);
        if (Number.isFinite(parsed) && parsed > 0) {
          return Math.trunc(parsed);
        }
      }
    }
    return undefined;
  }

  private resolveBackEdgeTarget(config: Record<string, unknown>): number | undefined {
    for (const key of BACK_EDGE_KEYS) {
      const value = config[key];
      if (typeof value === 'number' && Number.isFinite(value)) {
        return Math.trunc(value);
      }
      if (typeof value === 'string' && value.trim().length > 0) {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) {
          return Math.trunc(parsed);
        }
      }
    }
    return undefined;
  }

  private toUtcDateOnly(input: Date): Date {
    return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()));
  }

  private asRecord(value: unknown): Record<string, any> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, any>;
    }
    return {};
  }

  private asArray(value: unknown): unknown[] {
    if (Array.isArray(value)) {
      return value;
    }
    return [];
  }

  private errorPayload(
    code: GovernanceErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ): GovernanceErrorPayload {
    return {
      code,
      message,
      ...(details ? { details } : {}),
    };
  }

  private isUniqueConstraint(error: unknown): boolean {
    const prismaError = error as { code?: string } | undefined;
    return prismaError?.code === 'P2002';
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    return 'Unknown error';
  }
}
