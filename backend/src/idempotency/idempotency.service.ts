import { Injectable } from '@nestjs/common';
import { IdempotencyStatus, Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowMetrics } from '../common/metrics/workflow.metrics';
import { AppLoggerService } from '../common/logger/app-logger.service';
import { sanitizeIdempotencyPayload } from './idempotency-redaction.util';

export type IdempotencyBeginDecision =
  | {
      type: 'miss';
      entryId: string;
    }
  | {
      type: 'cached_success';
      statusCode: number;
      body: unknown;
    }
  | {
      type: 'cached_error';
      statusCode: number;
      body: unknown;
    }
  | {
      type: 'in_progress';
    }
  | {
      type: 'conflict';
    };

interface BeginApiParams {
  organizationId: string;
  actorUserId?: string | null;
  scope: string;
  key: string;
  requestFingerprint: string;
  correlationId?: string;
}

interface FinalizeSuccessParams {
  entryId: string;
  responseCode: number;
  responseBody: unknown;
}

interface FinalizeFailureParams {
  entryId: string;
  responseCode: number;
  errorBody: unknown;
  cacheable: boolean;
}

@Injectable()
export class IdempotencyService {
  private readonly ttlHours: number;
  private readonly staleInProgressSeconds: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly metrics: WorkflowMetrics,
    private readonly logger: AppLoggerService,
  ) {
    this.ttlHours = Number(this.configService.get<string>('IDEMPOTENCY_TTL_HOURS') || '24');
    this.staleInProgressSeconds = Number(
      this.configService.get<string>('IDEMPOTENCY_IN_PROGRESS_TIMEOUT_SECONDS') || '120',
    );
  }

  async beginApiOperation(params: BeginApiParams): Promise<IdempotencyBeginDecision> {
    const now = new Date();
    const expiresAt = this.calculateExpiry(now);

    try {
      const created = await this.prisma.idempotencyKey.create({
        data: {
          organizationId: params.organizationId,
          actorUserId: params.actorUserId ?? null,
          scope: params.scope,
          key: params.key,
          requestFingerprint: params.requestFingerprint,
          status: IdempotencyStatus.IN_PROGRESS,
          lockedAt: now,
          expiresAt,
        },
      });

      this.metrics.incrementIdempotencyMiss('api');
      this.logger.info('Idempotency miss recorded', {
        service: 'idempotency',
        organizationId: params.organizationId,
        actorUserId: params.actorUserId,
        scope: params.scope,
        key: params.key,
        correlationId: params.correlationId,
      });

      return {
        type: 'miss',
        entryId: created.id,
      };
    } catch (error) {
      if (!this.isUniqueConstraint(error)) {
        throw error;
      }
    }

    const existing = await this.findByUniqueScopeKey(params.organizationId, params.scope, params.key);
    if (!existing) {
      return {
        type: 'in_progress',
      };
    }

    if (existing.expiresAt <= now) {
      const recycled = await this.recycleExpiredKey(existing.id, params, expiresAt);
      if (recycled) {
        this.metrics.incrementIdempotencyMiss('api');
        return {
          type: 'miss',
          entryId: existing.id,
        };
      }
    }

    if (existing.requestFingerprint !== params.requestFingerprint) {
      this.metrics.incrementIdempotencyHit('api', 'conflict');
      return {
        type: 'conflict',
      };
    }

    if (existing.status === IdempotencyStatus.COMPLETED) {
      this.metrics.incrementIdempotencyHit('api', 'completed');
      return {
        type: 'cached_success',
        statusCode: existing.responseCode ?? 200,
        body: existing.responseBody,
      };
    }

    if (existing.status === IdempotencyStatus.FAILED) {
      if (
        existing.responseCode &&
        existing.responseCode >= 400 &&
        existing.responseCode < 500 &&
        existing.errorBody !== null
      ) {
        this.metrics.incrementIdempotencyHit('api', 'failed_cached');
        return {
          type: 'cached_error',
          statusCode: existing.responseCode,
          body: existing.errorBody,
        };
      }

      const reacquired = await this.reacquireFailed(existing.id, expiresAt);
      if (reacquired) {
        this.metrics.incrementIdempotencyMiss('api');
        return {
          type: 'miss',
          entryId: existing.id,
        };
      }
    }

    if (existing.status === IdempotencyStatus.IN_PROGRESS) {
      const staleThreshold = new Date(now.getTime() - this.staleInProgressSeconds * 1000);
      const tookOver = await this.takeOverStaleInProgress(existing.id, staleThreshold, expiresAt);
      if (tookOver) {
        this.metrics.incrementIdempotencyMiss('api');
        return {
          type: 'miss',
          entryId: existing.id,
        };
      }
    }

    this.metrics.incrementIdempotencyHit('api', 'in_progress');
    return {
      type: 'in_progress',
    };
  }

  async finalizeApiSuccess(params: FinalizeSuccessParams): Promise<void> {
    await this.prisma.idempotencyKey.update({
      where: { id: params.entryId },
      data: {
        status: IdempotencyStatus.COMPLETED,
        responseCode: params.responseCode,
        responseBody: sanitizeIdempotencyPayload(params.responseBody) as Prisma.InputJsonValue,
        errorBody: Prisma.DbNull,
      },
    });
  }

  async finalizeApiFailure(params: FinalizeFailureParams): Promise<void> {
    await this.prisma.idempotencyKey.update({
      where: { id: params.entryId },
      data: {
        status: IdempotencyStatus.FAILED,
        responseCode: params.responseCode,
        errorBody: params.cacheable
          ? (sanitizeIdempotencyPayload(params.errorBody) as Prisma.InputJsonValue)
          : Prisma.DbNull,
      },
    });
  }

  async tryAcquireScopedKey(params: {
    organizationId: string;
    actorUserId?: string | null;
    scope: string;
    key: string;
    requestFingerprint: string;
  }): Promise<boolean> {
    const now = new Date();
    const expiresAt = this.calculateExpiry(now);

    try {
      await this.prisma.idempotencyKey.create({
        data: {
          organizationId: params.organizationId,
          actorUserId: params.actorUserId ?? null,
          scope: params.scope,
          key: params.key,
          requestFingerprint: params.requestFingerprint,
          status: IdempotencyStatus.COMPLETED,
          responseCode: 200,
          lockedAt: now,
          expiresAt,
        },
      });

      this.metrics.incrementIdempotencyMiss(params.scope);
      return true;
    } catch (error) {
      if (!this.isUniqueConstraint(error)) {
        throw error;
      }
    }

    const existing = await this.findByUniqueScopeKey(params.organizationId, params.scope, params.key);
    if (!existing) {
      return false;
    }

    if (existing.expiresAt <= now) {
      const recycled = await this.recycleExpiredKey(existing.id, params, expiresAt, IdempotencyStatus.COMPLETED);
      if (recycled) {
        this.metrics.incrementIdempotencyMiss(params.scope);
        return true;
      }
    }

    this.metrics.incrementIdempotencyHit(params.scope, 'duplicate');
    return false;
  }

  async cleanupExpired(batchSize = 500): Promise<{ idempotency: number; webhook: number; stepDedup: number }> {
    const nowIso = new Date().toISOString();

    const idempotency = await this.deleteExpiredInBatches('"IdempotencyKey"', nowIso, batchSize);
    const webhook = await this.deleteExpiredInBatches('"WebhookDedup"', nowIso, batchSize);
    const stepDedup = await this.deleteExpiredInBatches('"StepDedup"', nowIso, batchSize);

    return {
      idempotency,
      webhook,
      stepDedup,
    };
  }

  private async findByUniqueScopeKey(organizationId: string, scope: string, key: string) {
    return this.prisma.idempotencyKey.findUnique({
      where: {
        organizationId_scope_key: {
          organizationId,
          scope,
          key,
        },
      },
    });
  }

  private async recycleExpiredKey(
    id: string,
    params: {
      actorUserId?: string | null;
      requestFingerprint: string;
    },
    expiresAt: Date,
    status: IdempotencyStatus = IdempotencyStatus.IN_PROGRESS,
  ): Promise<boolean> {
    const result = await this.prisma.idempotencyKey.updateMany({
      where: {
        id,
        expiresAt: {
          lte: new Date(),
        },
      },
      data: {
        actorUserId: params.actorUserId ?? null,
        requestFingerprint: params.requestFingerprint,
        status,
        responseCode: status === IdempotencyStatus.COMPLETED ? 200 : null,
        responseBody: Prisma.DbNull,
        errorBody: Prisma.DbNull,
        lockedAt: new Date(),
        expiresAt,
      },
    });

    return result.count === 1;
  }

  private async reacquireFailed(id: string, expiresAt: Date): Promise<boolean> {
    const result = await this.prisma.idempotencyKey.updateMany({
      where: {
        id,
        status: IdempotencyStatus.FAILED,
      },
      data: {
        status: IdempotencyStatus.IN_PROGRESS,
        responseCode: null,
        responseBody: Prisma.DbNull,
        errorBody: Prisma.DbNull,
        lockedAt: new Date(),
        expiresAt,
      },
    });

    return result.count === 1;
  }

  private async takeOverStaleInProgress(id: string, staleThreshold: Date, expiresAt: Date): Promise<boolean> {
    const result = await this.prisma.idempotencyKey.updateMany({
      where: {
        id,
        status: IdempotencyStatus.IN_PROGRESS,
        lockedAt: {
          lte: staleThreshold,
        },
      },
      data: {
        lockedAt: new Date(),
        expiresAt,
      },
    });

    return result.count === 1;
  }

  private calculateExpiry(from: Date): Date {
    const expiry = new Date(from);
    expiry.setHours(expiry.getHours() + this.ttlHours);
    return expiry;
  }

  private isUniqueConstraint(error: unknown): boolean {
    const prismaError = error as { code?: string } | undefined;
    return prismaError?.code === 'P2002';
  }

  private async deleteExpiredInBatches(
    tableName: '"IdempotencyKey"' | '"WebhookDedup"' | '"StepDedup"',
    nowIso: string,
    batchSize: number,
  ): Promise<number> {
    let totalDeleted = 0;

    while (true) {
      const deleted = await this.prisma.$executeRawUnsafe(
        `WITH expired AS (
          SELECT "id" FROM ${tableName}
          WHERE "expiresAt" < $1::timestamptz
          LIMIT $2
        )
        DELETE FROM ${tableName}
        WHERE "id" IN (SELECT "id" FROM expired);`,
        nowIso,
        batchSize,
      );

      const deletedCount = Number(deleted || 0);
      totalDeleted += deletedCount;
      if (deletedCount < batchSize) {
        break;
      }
    }

    return totalDeleted;
  }
}
