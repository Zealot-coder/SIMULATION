import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, StepDedupStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { stableObjectHash } from '../idempotency/idempotency-fingerprint.util';
import { sanitizeIdempotencyPayload } from '../idempotency/idempotency-redaction.util';
import { WorkflowMetrics } from '../common/metrics/workflow.metrics';
import { AppLoggerService } from '../common/logger/app-logger.service';

type AcquireStepDedupResult =
  | {
      type: 'acquired';
      lockId: string;
      inputHash: string;
    }
  | {
      type: 'done';
      dedupId: string;
      inputHash: string;
      result: unknown;
    }
  | {
      type: 'locked';
      dedupId: string;
      inputHash: string;
    };

@Injectable()
export class WorkflowStepDedupService {
  private readonly ttlHours: number;
  private readonly lockTimeoutSeconds: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly metrics: WorkflowMetrics,
    private readonly logger: AppLoggerService,
  ) {
    this.ttlHours = Number(this.configService.get<string>('STEP_DEDUP_TTL_HOURS') || '24');
    this.lockTimeoutSeconds = Number(
      this.configService.get<string>('STEP_DEDUP_LOCK_TIMEOUT_SECONDS') || '120',
    );
  }

  computeInputHash(input: unknown): string {
    return stableObjectHash(input, true);
  }

  async acquire(params: {
    organizationId: string;
    workflowRunId: string;
    stepKey: string;
    input: unknown;
  }): Promise<AcquireStepDedupResult> {
    const now = new Date();
    const expiresAt = new Date(now.getTime());
    expiresAt.setHours(expiresAt.getHours() + this.ttlHours);
    const inputHash = this.computeInputHash(params.input);

    try {
      const created = await this.prisma.stepDedup.create({
        data: {
          organizationId: params.organizationId,
          workflowRunId: params.workflowRunId,
          stepKey: params.stepKey,
          inputHash,
          status: StepDedupStatus.LOCKED,
          lockedAt: now,
          expiresAt,
        },
      });

      return {
        type: 'acquired',
        lockId: created.id,
        inputHash,
      };
    } catch (error) {
      if (!this.isUniqueConstraint(error)) {
        throw error;
      }
    }

    const existing = await this.prisma.stepDedup.findUnique({
      where: {
        organizationId_workflowRunId_stepKey_inputHash: {
          organizationId: params.organizationId,
          workflowRunId: params.workflowRunId,
          stepKey: params.stepKey,
          inputHash,
        },
      },
    });

    if (!existing) {
      return {
        type: 'locked',
        dedupId: 'unknown',
        inputHash,
      };
    }

    if (existing.status === StepDedupStatus.DONE) {
      this.metrics.incrementStepDuplicate('done', params.organizationId);
      return {
        type: 'done',
        dedupId: existing.id,
        inputHash,
        result: existing.result,
      };
    }

    const staleThreshold = new Date(now.getTime() - this.lockTimeoutSeconds * 1000);
    const tookOver = await this.prisma.stepDedup.updateMany({
      where: {
        id: existing.id,
        status: StepDedupStatus.LOCKED,
        lockedAt: {
          lte: staleThreshold,
        },
      },
      data: {
        lockedAt: now,
        expiresAt,
      },
    });

    if (tookOver.count === 1) {
      this.logger.warn('Taking over stale step dedup lock', {
        service: 'workflow-step-dedup',
        organizationId: params.organizationId,
        workflowRunId: params.workflowRunId,
        stepKey: params.stepKey,
      });
      return {
        type: 'acquired',
        lockId: existing.id,
        inputHash,
      };
    }

    this.metrics.incrementStepDuplicate('locked', params.organizationId);
    return {
      type: 'locked',
      dedupId: existing.id,
      inputHash,
    };
  }

  async markDone(lockId: string, result: unknown): Promise<void> {
    await this.prisma.stepDedup.update({
      where: { id: lockId },
      data: {
        status: StepDedupStatus.DONE,
        result: sanitizeIdempotencyPayload(result) as Prisma.InputJsonValue,
        lockedAt: new Date(),
      },
    });
  }

  async releaseLock(lockId: string): Promise<void> {
    await this.prisma.stepDedup.deleteMany({
      where: {
        id: lockId,
        status: StepDedupStatus.LOCKED,
      },
    });
  }

  private isUniqueConstraint(error: unknown): boolean {
    const prismaError = error as { code?: string } | undefined;
    return prismaError?.code === 'P2002';
  }
}
