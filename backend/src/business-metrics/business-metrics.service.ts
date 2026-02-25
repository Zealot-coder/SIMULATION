import { Injectable } from '@nestjs/common';
import {
  OrganizationDailyMetric,
  OrganizationHourlyMetric,
  Prisma,
  WorkflowStatus,
} from '@prisma/client';
import { GovernanceService } from '../governance/governance.service';
import { AppLoggerService } from '../common/logger/app-logger.service';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessMetricsCacheService } from './business-metrics-cache.service';
import { METRICS_REGISTRY } from './metrics-registry';
import {
  AlertItem,
  DateRange,
  EMPTY_METRICS_AGGREGATE,
  MetricsAggregate,
  MetricsDelta,
  avgExecutionSeconds,
  mergeMetricsAggregate,
  normalizeDeltaPercent,
  safeRate,
} from './metrics.types';

type MetricRow = Pick<
  OrganizationHourlyMetric,
  | 'ordersCreated'
  | 'paymentsTotal'
  | 'paymentsSuccessful'
  | 'workflowsTotal'
  | 'workflowsFailed'
  | 'totalExecutionTimeMs'
  | 'messagesSent'
  | 'messagesDelivered'
> &
  Partial<Pick<OrganizationHourlyMetric, 'hourBucket'>> &
  Partial<Pick<OrganizationDailyMetric, 'dayBucket'>>;

type MetricGranularity = 'hour' | 'day';

const CACHE_TTL_SECONDS = Number(process.env.BUSINESS_METRICS_CACHE_TTL_SEC || '45');
const PAYMENT_PENDING_KEYWORDS = ['pending', 'expired', 'created', 'queued'];
const PAYMENT_SUCCESS_KEYWORDS = ['success', 'successful', 'paid', 'confirmed', 'completed'];
const PAYMENT_FAILURE_KEYWORDS = ['failed', 'failure', 'declined', 'rejected', 'error', 'cancelled'];

@Injectable()
export class BusinessMetricsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly governanceService: GovernanceService,
    private readonly cache: BusinessMetricsCacheService,
    private readonly logger: AppLoggerService,
  ) {}

  async recordEventSignal(params: {
    organizationId: string;
    eventType: string;
    eventName: string;
    payload: unknown;
    source?: string | null;
    occurredAt?: Date;
  }): Promise<void> {
    try {
      const delta = this.classifyEventDelta(params);
      await this.applyDelta(params.organizationId, params.occurredAt || new Date(), delta);
    } catch (error) {
      this.logger.warn('Business metrics event aggregation skipped', {
        service: 'business-metrics',
        organizationId: params.organizationId,
        reason: this.getErrorMessage(error),
      });
    }
  }

  async recordWorkflowOutcome(params: {
    organizationId: string;
    status: WorkflowStatus;
    startedAt?: Date | null;
    completedAt?: Date | null;
  }): Promise<void> {
    const isFailed =
      params.status === WorkflowStatus.FAILED ||
      params.status === WorkflowStatus.FAILED_SAFETY_LIMIT;
    const isTerminal =
      params.status === WorkflowStatus.SUCCESS ||
      params.status === WorkflowStatus.FAILED ||
      params.status === WorkflowStatus.FAILED_SAFETY_LIMIT;

    if (!isTerminal) {
      return;
    }

    try {
      const completedAt = params.completedAt || new Date();
      const startedAt = params.startedAt || completedAt;
      const durationMs = Math.max(0, completedAt.getTime() - startedAt.getTime());
      await this.applyDelta(params.organizationId, completedAt, {
        workflowsTotal: 1,
        workflowsFailed: isFailed ? 1 : 0,
        totalExecutionTimeMs: durationMs,
      });
    } catch (error) {
      this.logger.warn('Business metrics workflow aggregation skipped', {
        service: 'business-metrics',
        organizationId: params.organizationId,
        reason: this.getErrorMessage(error),
      });
    }
  }

  async recordMessageSent(params: {
    organizationId: string;
    sentAt?: Date;
    delivered?: boolean;
  }): Promise<void> {
    try {
      await this.applyDelta(params.organizationId, params.sentAt || new Date(), {
        messagesSent: 1,
        messagesDelivered: params.delivered ? 1 : 0,
      });
    } catch (error) {
      this.logger.warn('Business metrics message aggregation skipped', {
        service: 'business-metrics',
        organizationId: params.organizationId,
        reason: this.getErrorMessage(error),
      });
    }
  }

  async recordMessageDelivered(params: {
    organizationId: string;
    deliveredAt?: Date;
  }): Promise<void> {
    try {
      await this.applyDelta(params.organizationId, params.deliveredAt || new Date(), {
        messagesDelivered: 1,
      });
    } catch (error) {
      this.logger.warn('Business metrics delivery aggregation skipped', {
        service: 'business-metrics',
        organizationId: params.organizationId,
        reason: this.getErrorMessage(error),
      });
    }
  }

  async getSummary(params: {
    organizationId: string;
    from?: Date;
    to?: Date;
  }) {
    const range = this.resolveRange(params.from, params.to, {
      fallbackHours: 24,
      clampDays: 90,
    });
    const comparisonRange = this.previousRange(range);
    const granularity = this.resolveGranularity(range);
    const keyPart = this.cacheKeyFromRange(range, granularity);

    return this.cache.getOrSet({
      organizationId: params.organizationId,
      scope: 'summary',
      keyPart,
      ttlSeconds: CACHE_TTL_SECONDS,
      resolver: async () => {
        const [currentRows, previousRows, limits] = await Promise.all([
          this.getAggregateRows(params.organizationId, range, granularity),
          this.getAggregateRows(params.organizationId, comparisonRange, granularity),
          this.governanceService.resolveEffectiveLimits(params.organizationId),
        ]);

        const current = this.reduceRows(currentRows);
        const previous = this.reduceRows(previousRows);

        const kpis = METRICS_REGISTRY.map((entry) =>
          entry.compute({
            current,
            previous,
          }),
        );
        const alerts = METRICS_REGISTRY.flatMap((entry, index) => {
          const card = kpis[index];
          return entry.buildAlerts ? entry.buildAlerts(card, { current, previous }) : [];
        });

        return {
          organizationId: params.organizationId,
          plan: {
            id: limits.planId,
            name: limits.planName,
          },
          range: {
            from: range.from.toISOString(),
            to: range.to.toISOString(),
            granularity,
          },
          generatedAt: new Date().toISOString(),
          kpis,
          alerts,
          systemHealth: {
            status: this.resolveHealthStatus(alerts),
            alertCount: alerts.length,
          },
        };
      },
    });
  }

  async getTrends(params: {
    organizationId: string;
    from?: Date;
    to?: Date;
    granularity?: MetricGranularity | 'auto';
  }) {
    const range = this.resolveRange(params.from, params.to, {
      fallbackHours: 24 * 7,
      clampDays: 180,
    });
    const granularity =
      params.granularity && params.granularity !== 'auto'
        ? params.granularity
        : this.resolveGranularity(range);
    const keyPart = this.cacheKeyFromRange(range, granularity);

    return this.cache.getOrSet({
      organizationId: params.organizationId,
      scope: 'trends',
      keyPart,
      ttlSeconds: CACHE_TTL_SECONDS,
      resolver: async () => {
        const rows = await this.getAggregateRows(params.organizationId, range, granularity);
        const sequence = this.buildBucketSequence(range, granularity);
        const rowByKey = new Map<string, MetricRow>();
        for (const row of rows) {
          const bucketDate = this.rowBucketDate(row);
          if (!bucketDate) {
            continue;
          }
          rowByKey.set(this.bucketKey(bucketDate, granularity), row);
        }

        const points = sequence.map((bucket) => {
          const row = rowByKey.get(this.bucketKey(bucket, granularity));
          const aggregate = row ? this.reduceRows([row]) : EMPTY_METRICS_AGGREGATE;
          return {
            bucketStart: bucket.toISOString(),
            ordersCreated: aggregate.ordersCreated,
            paymentsTotal: aggregate.paymentsTotal,
            paymentsSuccessful: aggregate.paymentsSuccessful,
            paymentSuccessRate: safeRate(aggregate.paymentsSuccessful, aggregate.paymentsTotal),
            workflowsTotal: aggregate.workflowsTotal,
            workflowsFailed: aggregate.workflowsFailed,
            workflowFailureRate: safeRate(aggregate.workflowsFailed, aggregate.workflowsTotal),
            averageExecutionSeconds: avgExecutionSeconds(
              aggregate.totalExecutionTimeMs,
              aggregate.workflowsTotal,
            ),
            messagesSent: aggregate.messagesSent,
            messagesDelivered: aggregate.messagesDelivered,
            messageDeliveryRate: safeRate(aggregate.messagesDelivered, aggregate.messagesSent),
          };
        });

        const totals = this.reduceRows(rows);
        return {
          organizationId: params.organizationId,
          range: {
            from: range.from.toISOString(),
            to: range.to.toISOString(),
            granularity,
          },
          generatedAt: new Date().toISOString(),
          points,
          totals,
        };
      },
    });
  }

  async getWorkflowHealth(params: {
    organizationId: string;
    from?: Date;
    to?: Date;
    limit?: number;
  }) {
    const range = this.resolveRange(params.from, params.to, {
      fallbackHours: 24 * 7,
      clampDays: 180,
    });
    const comparisonRange = this.previousRange(range);
    const granularity = this.resolveGranularity(range);
    const keyPart = `${this.cacheKeyFromRange(range, granularity)}:limit:${params.limit || 10}`;

    return this.cache.getOrSet({
      organizationId: params.organizationId,
      scope: 'workflow-health',
      keyPart,
      ttlSeconds: CACHE_TTL_SECONDS,
      resolver: async () => {
        const [currentRows, previousRows, retryCount, dlqCount, failures, safetyViolations] =
          await Promise.all([
            this.getAggregateRows(params.organizationId, range, granularity),
            this.getAggregateRows(params.organizationId, comparisonRange, granularity),
            this.prisma.workflowStep.count({
              where: {
                execution: {
                  organizationId: params.organizationId,
                },
                attemptCount: {
                  gt: 1,
                },
                updatedAt: {
                  gte: range.from,
                  lte: range.to,
                },
              },
            }),
            this.prisma.workflowStepDlqItem.count({
              where: {
                organizationId: params.organizationId,
                status: {
                  in: ['OPEN', 'REPLAYING'],
                },
              },
            }),
            this.prisma.workflowExecution.findMany({
              where: {
                organizationId: params.organizationId,
                status: {
                  in: [WorkflowStatus.FAILED, WorkflowStatus.FAILED_SAFETY_LIMIT],
                },
                completedAt: {
                  gte: range.from,
                  lte: range.to,
                },
              },
              include: {
                workflow: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
              orderBy: {
                completedAt: 'desc',
              },
              take: Math.min(50, Math.max(1, params.limit || 10)),
            }),
            this.prisma.workflowSafetyViolation.findMany({
              where: {
                organizationId: params.organizationId,
                createdAt: {
                  gte: range.from,
                  lte: range.to,
                },
              },
              orderBy: {
                createdAt: 'desc',
              },
              take: 20,
            }),
          ]);

        const current = this.reduceRows(currentRows);
        const previous = this.reduceRows(previousRows);
        const failureRate = safeRate(current.workflowsFailed, current.workflowsTotal);
        const previousFailureRate = safeRate(previous.workflowsFailed, previous.workflowsTotal);
        const retryImpact =
          current.workflowsTotal > 0
            ? Number(((retryCount / current.workflowsTotal) * 100).toFixed(2))
            : 0;

        const alerts: AlertItem[] = [];
        if (failureRate > 5) {
          alerts.push({
            code: 'workflow_failure_rate_high',
            severity: failureRate > 15 ? 'critical' : 'warning',
            title: 'High workflow failure rate',
            description: `Failure rate is ${failureRate}% in selected period.`,
            action: 'Inspect recent failures and replay DLQ items.',
          });
        }
        if (retryImpact > 25) {
          alerts.push({
            code: 'workflow_retry_impact_high',
            severity: retryImpact > 50 ? 'critical' : 'warning',
            title: 'Retry pressure is increasing',
            description: `${retryImpact}% retry impact across workflow runs.`,
            action: 'Review step-level retries and provider latency.',
          });
        }

        return {
          organizationId: params.organizationId,
          range: {
            from: range.from.toISOString(),
            to: range.to.toISOString(),
            granularity,
          },
          generatedAt: new Date().toISOString(),
          summary: {
            workflowsTotal: current.workflowsTotal,
            workflowsFailed: current.workflowsFailed,
            failureRate,
            previousFailureRate,
            failureRateDeltaPercent: normalizeDeltaPercent(failureRate, previousFailureRate),
            retryCount,
            retryImpactPercent: retryImpact,
            dlqOpenCount: dlqCount,
          },
          recentFailures: failures.map((failure) => ({
            id: failure.id,
            workflowId: failure.workflowId,
            workflowName: failure.workflow?.name || 'Unknown workflow',
            status: failure.status,
            error: failure.error,
            completedAt: failure.completedAt?.toISOString() || null,
            safetyLimitCode: failure.safetyLimitCode,
          })),
          safetyViolations: safetyViolations.map((item) => ({
            id: item.id,
            limitCode: item.limitCode,
            actionTaken: item.actionTaken,
            createdAt: item.createdAt.toISOString(),
            workflowId: item.workflowId,
            workflowExecutionId: item.workflowExecutionId,
          })),
          alerts,
          healthStatus: this.resolveHealthStatus(alerts),
        };
      },
    });
  }

  private async applyDelta(
    organizationId: string,
    timestamp: Date,
    delta: MetricsDelta,
  ): Promise<void> {
    const normalized = this.normalizeDelta(delta);
    if (!this.hasDelta(normalized)) {
      return;
    }

    const hourBucket = this.toUtcHourBucket(timestamp);
    const dayBucket = this.toUtcDayBucket(timestamp);
    const execMs = BigInt(normalized.totalExecutionTimeMs || 0);

    await this.prisma.$transaction(async (tx) => {
      await tx.organizationHourlyMetric.upsert({
        where: {
          organizationId_hourBucket: {
            organizationId,
            hourBucket,
          },
        },
        create: {
          organizationId,
          hourBucket,
          ordersCreated: normalized.ordersCreated || 0,
          paymentsTotal: normalized.paymentsTotal || 0,
          paymentsSuccessful: normalized.paymentsSuccessful || 0,
          workflowsTotal: normalized.workflowsTotal || 0,
          workflowsFailed: normalized.workflowsFailed || 0,
          totalExecutionTimeMs: execMs,
          messagesSent: normalized.messagesSent || 0,
          messagesDelivered: normalized.messagesDelivered || 0,
        },
        update: {
          ordersCreated: {
            increment: normalized.ordersCreated || 0,
          },
          paymentsTotal: {
            increment: normalized.paymentsTotal || 0,
          },
          paymentsSuccessful: {
            increment: normalized.paymentsSuccessful || 0,
          },
          workflowsTotal: {
            increment: normalized.workflowsTotal || 0,
          },
          workflowsFailed: {
            increment: normalized.workflowsFailed || 0,
          },
          totalExecutionTimeMs: {
            increment: execMs,
          },
          messagesSent: {
            increment: normalized.messagesSent || 0,
          },
          messagesDelivered: {
            increment: normalized.messagesDelivered || 0,
          },
        },
      });

      await tx.organizationDailyMetric.upsert({
        where: {
          organizationId_dayBucket: {
            organizationId,
            dayBucket,
          },
        },
        create: {
          organizationId,
          dayBucket,
          ordersCreated: normalized.ordersCreated || 0,
          paymentsTotal: normalized.paymentsTotal || 0,
          paymentsSuccessful: normalized.paymentsSuccessful || 0,
          workflowsTotal: normalized.workflowsTotal || 0,
          workflowsFailed: normalized.workflowsFailed || 0,
          totalExecutionTimeMs: execMs,
          messagesSent: normalized.messagesSent || 0,
          messagesDelivered: normalized.messagesDelivered || 0,
        },
        update: {
          ordersCreated: {
            increment: normalized.ordersCreated || 0,
          },
          paymentsTotal: {
            increment: normalized.paymentsTotal || 0,
          },
          paymentsSuccessful: {
            increment: normalized.paymentsSuccessful || 0,
          },
          workflowsTotal: {
            increment: normalized.workflowsTotal || 0,
          },
          workflowsFailed: {
            increment: normalized.workflowsFailed || 0,
          },
          totalExecutionTimeMs: {
            increment: execMs,
          },
          messagesSent: {
            increment: normalized.messagesSent || 0,
          },
          messagesDelivered: {
            increment: normalized.messagesDelivered || 0,
          },
        },
      });
    });

    await this.cache.bumpOrganizationCacheVersion(organizationId);
  }

  private classifyEventDelta(params: {
    eventType: string;
    eventName: string;
    payload: unknown;
    source?: string | null;
  }): MetricsDelta {
    const payload = this.asRecord(params.payload);
    const eventType = String(params.eventType || '').trim().toLowerCase();
    const eventName = String(params.eventName || '').trim().toLowerCase();
    const source = String(params.source || '').trim().toLowerCase();
    const text = `${eventType} ${eventName} ${source} ${this.extractTextTokens(payload)}`;

    const delta: MetricsDelta = {};

    if (
      eventType === 'sale_recorded' ||
      this.containsAny(text, ['order_created', 'new_order', 'checkout_complete', 'sale_recorded'])
    ) {
      delta.ordersCreated = 1;
    }

    const paymentClassification = this.classifyPaymentFromEvent(text, payload);
    if (paymentClassification.total > 0) {
      delta.paymentsTotal = paymentClassification.total;
      delta.paymentsSuccessful = paymentClassification.successful;
    }

    return delta;
  }

  private classifyPaymentFromEvent(
    eventText: string,
    payload: Record<string, unknown>,
  ): { total: number; successful: number } {
    const statusCandidates = this.extractStatusCandidates(payload);
    const statusText = statusCandidates.join(' ');
    const mergedText = `${eventText} ${statusText}`;
    const paymentLike = this.containsAny(mergedText, [
      'payment',
      'transaction',
      'momo',
      'checkout',
      'invoice',
    ]);

    if (!paymentLike) {
      return { total: 0, successful: 0 };
    }

    if (this.containsAny(statusText, PAYMENT_PENDING_KEYWORDS)) {
      return { total: 0, successful: 0 };
    }

    if (this.containsAny(statusText, PAYMENT_SUCCESS_KEYWORDS)) {
      return { total: 1, successful: 1 };
    }

    if (this.containsAny(statusText, PAYMENT_FAILURE_KEYWORDS)) {
      return { total: 1, successful: 0 };
    }

    if (this.containsAny(eventText, ['payment_success', 'payment_confirmed', 'payment_received'])) {
      return { total: 1, successful: 1 };
    }

    if (this.containsAny(eventText, ['payment_failed', 'payment_declined', 'payment_error'])) {
      return { total: 1, successful: 0 };
    }

    return { total: 0, successful: 0 };
  }

  private extractStatusCandidates(payload: Record<string, unknown>): string[] {
    const candidates: string[] = [];
    const keys = [
      'status',
      'payment_status',
      'paymentStatus',
      'transaction_status',
      'transactionStatus',
      'result',
      'state',
      'event',
      'eventType',
      'type',
    ];

    for (const key of keys) {
      const value = payload[key];
      if (typeof value === 'string' && value.trim().length > 0) {
        candidates.push(value.trim().toLowerCase());
      }
    }

    return candidates;
  }

  private async getAggregateRows(
    organizationId: string,
    range: DateRange,
    granularity: MetricGranularity,
  ): Promise<MetricRow[]> {
    if (granularity === 'hour') {
      return this.prisma.organizationHourlyMetric.findMany({
        where: {
          organizationId,
          hourBucket: {
            gte: range.from,
            lte: range.to,
          },
        },
        orderBy: {
          hourBucket: 'asc',
        },
      });
    }

    return this.prisma.organizationDailyMetric.findMany({
      where: {
        organizationId,
        dayBucket: {
          gte: this.toUtcDayBucket(range.from),
          lte: this.toUtcDayBucket(range.to),
        },
      },
      orderBy: {
        dayBucket: 'asc',
      },
    });
  }

  private reduceRows(rows: MetricRow[]): MetricsAggregate {
    return rows.reduce<MetricsAggregate>((acc, row) => {
      return mergeMetricsAggregate(acc, {
        ordersCreated: row.ordersCreated || 0,
        paymentsTotal: row.paymentsTotal || 0,
        paymentsSuccessful: row.paymentsSuccessful || 0,
        workflowsTotal: row.workflowsTotal || 0,
        workflowsFailed: row.workflowsFailed || 0,
        totalExecutionTimeMs: Number(row.totalExecutionTimeMs || 0n),
        messagesSent: row.messagesSent || 0,
        messagesDelivered: row.messagesDelivered || 0,
      });
    }, EMPTY_METRICS_AGGREGATE);
  }

  private resolveRange(
    from: Date | undefined,
    to: Date | undefined,
    options: { fallbackHours: number; clampDays: number },
  ): DateRange {
    const resolvedTo = to || new Date();
    const fallbackFrom = new Date(resolvedTo.getTime() - options.fallbackHours * 60 * 60 * 1000);
    const resolvedFrom = from || fallbackFrom;

    const safeFrom =
      resolvedFrom.getTime() <= resolvedTo.getTime() ? resolvedFrom : fallbackFrom;
    const maxWindowMs = options.clampDays * 24 * 60 * 60 * 1000;
    if (resolvedTo.getTime() - safeFrom.getTime() > maxWindowMs) {
      return {
        from: new Date(resolvedTo.getTime() - maxWindowMs),
        to: resolvedTo,
      };
    }

    return {
      from: safeFrom,
      to: resolvedTo,
    };
  }

  private previousRange(range: DateRange): DateRange {
    const span = Math.max(60 * 1000, range.to.getTime() - range.from.getTime());
    return {
      from: new Date(range.from.getTime() - span),
      to: new Date(range.from.getTime()),
    };
  }

  private resolveGranularity(range: DateRange): MetricGranularity {
    const hours = (range.to.getTime() - range.from.getTime()) / (60 * 60 * 1000);
    return hours <= 48 ? 'hour' : 'day';
  }

  private buildBucketSequence(range: DateRange, granularity: MetricGranularity): Date[] {
    const buckets: Date[] = [];
    const start =
      granularity === 'hour' ? this.toUtcHourBucket(range.from) : this.toUtcDayBucket(range.from);
    const end = granularity === 'hour' ? this.toUtcHourBucket(range.to) : this.toUtcDayBucket(range.to);

    let cursor = start;
    while (cursor.getTime() <= end.getTime()) {
      buckets.push(cursor);
      cursor =
        granularity === 'hour'
          ? new Date(cursor.getTime() + 60 * 60 * 1000)
          : new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
    }
    return buckets;
  }

  private resolveHealthStatus(alerts: AlertItem[]): 'healthy' | 'warning' | 'critical' {
    if (alerts.some((alert) => alert.severity === 'critical')) {
      return 'critical';
    }
    if (alerts.some((alert) => alert.severity === 'warning')) {
      return 'warning';
    }
    return 'healthy';
  }

  private normalizeDelta(delta: MetricsDelta): MetricsDelta {
    const sanitizeInt = (value: number | undefined) => Math.max(0, Math.trunc(value || 0));
    return {
      ordersCreated: sanitizeInt(delta.ordersCreated),
      paymentsTotal: sanitizeInt(delta.paymentsTotal),
      paymentsSuccessful: sanitizeInt(delta.paymentsSuccessful),
      workflowsTotal: sanitizeInt(delta.workflowsTotal),
      workflowsFailed: sanitizeInt(delta.workflowsFailed),
      totalExecutionTimeMs: sanitizeInt(delta.totalExecutionTimeMs),
      messagesSent: sanitizeInt(delta.messagesSent),
      messagesDelivered: sanitizeInt(delta.messagesDelivered),
    };
  }

  private hasDelta(delta: MetricsDelta): boolean {
    return (
      (delta.ordersCreated || 0) > 0 ||
      (delta.paymentsTotal || 0) > 0 ||
      (delta.paymentsSuccessful || 0) > 0 ||
      (delta.workflowsTotal || 0) > 0 ||
      (delta.workflowsFailed || 0) > 0 ||
      (delta.totalExecutionTimeMs || 0) > 0 ||
      (delta.messagesSent || 0) > 0 ||
      (delta.messagesDelivered || 0) > 0
    );
  }

  private cacheKeyFromRange(range: DateRange, granularity: MetricGranularity): string {
    return `${range.from.toISOString()}::${range.to.toISOString()}::${granularity}`;
  }

  private toUtcHourBucket(date: Date): Date {
    return new Date(
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
        date.getUTCHours(),
        0,
        0,
        0,
      ),
    );
  }

  private toUtcDayBucket(date: Date): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
  }

  private bucketKey(date: Date, granularity: MetricGranularity): string {
    if (granularity === 'hour') {
      return date.toISOString().slice(0, 13);
    }
    return date.toISOString().slice(0, 10);
  }

  private rowBucketDate(row: MetricRow): Date | null {
    if (row.hourBucket instanceof Date) {
      return row.hourBucket;
    }
    if (row.dayBucket instanceof Date) {
      return row.dayBucket;
    }
    return null;
  }

  private asRecord(value: unknown): Record<string, unknown> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return {};
  }

  private extractTextTokens(value: unknown): string {
    if (typeof value === 'string') {
      return value.toLowerCase();
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    if (Array.isArray(value)) {
      return value.map((item) => this.extractTextTokens(item)).join(' ');
    }
    if (value && typeof value === 'object') {
      return Object.values(value as Record<string, unknown>)
        .map((item) => this.extractTextTokens(item))
        .join(' ');
    }
    return '';
  }

  private containsAny(text: string, keywords: string[]): boolean {
    const normalized = text.toLowerCase();
    return keywords.some((keyword) => normalized.includes(keyword.toLowerCase()));
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return `${error.code}: ${error.message}`;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}
