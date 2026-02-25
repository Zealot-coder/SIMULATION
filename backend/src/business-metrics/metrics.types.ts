export interface MetricsAggregate {
  ordersCreated: number;
  paymentsTotal: number;
  paymentsSuccessful: number;
  workflowsTotal: number;
  workflowsFailed: number;
  totalExecutionTimeMs: number;
  messagesSent: number;
  messagesDelivered: number;
}

export interface MetricsDelta {
  ordersCreated?: number;
  paymentsTotal?: number;
  paymentsSuccessful?: number;
  workflowsTotal?: number;
  workflowsFailed?: number;
  totalExecutionTimeMs?: number;
  messagesSent?: number;
  messagesDelivered?: number;
}

export interface DateRange {
  from: Date;
  to: Date;
}

export type TrendDirection = 'up' | 'down' | 'flat';
export type MetricSeverity = 'healthy' | 'warning' | 'critical';

export interface MetricCard {
  key: string;
  label: string;
  value: number;
  unit: 'count' | 'percent' | 'seconds';
  trend: TrendDirection;
  deltaPercent: number | null;
  severity: MetricSeverity;
  description: string;
}

export interface AlertItem {
  code: string;
  severity: MetricSeverity;
  title: string;
  description: string;
  action: string;
}

export interface MetricComputationContext {
  current: MetricsAggregate;
  previous: MetricsAggregate;
}

export interface MetricRegistryEntry {
  key: string;
  label: string;
  compute: (ctx: MetricComputationContext) => MetricCard;
  buildAlerts?: (card: MetricCard, ctx: MetricComputationContext) => AlertItem[];
}

export const EMPTY_METRICS_AGGREGATE: MetricsAggregate = {
  ordersCreated: 0,
  paymentsTotal: 0,
  paymentsSuccessful: 0,
  workflowsTotal: 0,
  workflowsFailed: 0,
  totalExecutionTimeMs: 0,
  messagesSent: 0,
  messagesDelivered: 0,
};

export function mergeMetricsAggregate(
  base: MetricsAggregate,
  delta: MetricsDelta,
): MetricsAggregate {
  return {
    ordersCreated: base.ordersCreated + (delta.ordersCreated || 0),
    paymentsTotal: base.paymentsTotal + (delta.paymentsTotal || 0),
    paymentsSuccessful: base.paymentsSuccessful + (delta.paymentsSuccessful || 0),
    workflowsTotal: base.workflowsTotal + (delta.workflowsTotal || 0),
    workflowsFailed: base.workflowsFailed + (delta.workflowsFailed || 0),
    totalExecutionTimeMs: base.totalExecutionTimeMs + (delta.totalExecutionTimeMs || 0),
    messagesSent: base.messagesSent + (delta.messagesSent || 0),
    messagesDelivered: base.messagesDelivered + (delta.messagesDelivered || 0),
  };
}

export function normalizeDeltaPercent(current: number, previous: number): number | null {
  if (previous === 0) {
    if (current === 0) {
      return 0;
    }
    return 100;
  }
  return Number((((current - previous) / previous) * 100).toFixed(2));
}

export function safeRate(numerator: number, denominator: number): number {
  if (denominator <= 0) {
    return 0;
  }
  return Number(((numerator / denominator) * 100).toFixed(2));
}

export function avgExecutionSeconds(totalExecutionTimeMs: number, workflowsTotal: number): number {
  if (workflowsTotal <= 0) {
    return 0;
  }
  return Number((totalExecutionTimeMs / workflowsTotal / 1000).toFixed(2));
}
