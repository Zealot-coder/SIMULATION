import {
  AlertItem,
  MetricCard,
  MetricComputationContext,
  MetricRegistryEntry,
  avgExecutionSeconds,
  normalizeDeltaPercent,
  safeRate,
} from './metrics.types';

function resolveTrend(current: number, previous: number, higherIsBetter: boolean): MetricCard['trend'] {
  if (current === previous) {
    return 'flat';
  }

  if (higherIsBetter) {
    return current > previous ? 'up' : 'down';
  }

  return current < previous ? 'up' : 'down';
}

function paymentSuccessCard(ctx: MetricComputationContext): MetricCard {
  const currentRate = safeRate(ctx.current.paymentsSuccessful, ctx.current.paymentsTotal);
  const previousRate = safeRate(ctx.previous.paymentsSuccessful, ctx.previous.paymentsTotal);
  const severity =
    currentRate < 75 ? 'critical' : currentRate < 90 ? 'warning' : 'healthy';

  return {
    key: 'payment_success_rate',
    label: 'Payment Success Rate',
    value: currentRate,
    unit: 'percent',
    trend: resolveTrend(currentRate, previousRate, true),
    deltaPercent: normalizeDeltaPercent(currentRate, previousRate),
    severity,
    description: `${ctx.current.paymentsSuccessful}/${ctx.current.paymentsTotal} successful payments`,
  };
}

function workflowFailureCard(ctx: MetricComputationContext): MetricCard {
  const currentRate = safeRate(ctx.current.workflowsFailed, ctx.current.workflowsTotal);
  const previousRate = safeRate(ctx.previous.workflowsFailed, ctx.previous.workflowsTotal);
  const severity =
    currentRate > 15 ? 'critical' : currentRate > 5 ? 'warning' : 'healthy';

  return {
    key: 'workflow_failure_rate',
    label: 'Workflow Failure Rate',
    value: currentRate,
    unit: 'percent',
    trend: resolveTrend(currentRate, previousRate, false),
    deltaPercent: normalizeDeltaPercent(currentRate, previousRate),
    severity,
    description: `${ctx.current.workflowsFailed}/${ctx.current.workflowsTotal} failed workflow runs`,
  };
}

function averageExecutionCard(ctx: MetricComputationContext): MetricCard {
  const currentSeconds = avgExecutionSeconds(
    ctx.current.totalExecutionTimeMs,
    ctx.current.workflowsTotal,
  );
  const previousSeconds = avgExecutionSeconds(
    ctx.previous.totalExecutionTimeMs,
    ctx.previous.workflowsTotal,
  );

  const degradation =
    previousSeconds <= 0
      ? 0
      : Number((((currentSeconds - previousSeconds) / previousSeconds) * 100).toFixed(2));

  const severity =
    degradation > 35 ? 'critical' : degradation > 20 ? 'warning' : 'healthy';

  return {
    key: 'avg_execution_time',
    label: 'Avg Execution Time',
    value: currentSeconds,
    unit: 'seconds',
    trend: resolveTrend(currentSeconds, previousSeconds, false),
    deltaPercent: normalizeDeltaPercent(currentSeconds, previousSeconds),
    severity,
    description: `${ctx.current.workflowsTotal} workflows in selected range`,
  };
}

function deliveryRateCard(ctx: MetricComputationContext): MetricCard {
  const currentRate = safeRate(ctx.current.messagesDelivered, ctx.current.messagesSent);
  const previousRate = safeRate(ctx.previous.messagesDelivered, ctx.previous.messagesSent);
  const severity =
    currentRate < 80 ? 'critical' : currentRate < 92 ? 'warning' : 'healthy';

  return {
    key: 'message_delivery_rate',
    label: 'Message Delivery Rate',
    value: currentRate,
    unit: 'percent',
    trend: resolveTrend(currentRate, previousRate, true),
    deltaPercent: normalizeDeltaPercent(currentRate, previousRate),
    severity,
    description: `${ctx.current.messagesDelivered}/${ctx.current.messagesSent} delivered`,
  };
}

function ordersCreatedCard(ctx: MetricComputationContext): MetricCard {
  const current = ctx.current.ordersCreated;
  const previous = ctx.previous.ordersCreated;
  const severity = current === 0 && previous > 0 ? 'warning' : 'healthy';

  return {
    key: 'orders_created',
    label: 'Orders Created',
    value: current,
    unit: 'count',
    trend: resolveTrend(current, previous, true),
    deltaPercent: normalizeDeltaPercent(current, previous),
    severity,
    description: 'Orders captured from commerce events',
  };
}

function buildDefaultAlerts(card: MetricCard): AlertItem[] {
  if (card.severity === 'healthy') {
    return [];
  }

  const genericActions: Record<string, string> = {
    orders_created: 'Review order ingestion and checkout flow.',
    payment_success_rate: 'Check payment provider health and retry failures.',
    workflow_failure_rate: 'Inspect failed workflows and DLQ queue.',
    avg_execution_time: 'Inspect queue backlog and long-running steps.',
    message_delivery_rate: 'Verify channel provider latency and webhook callbacks.',
  };

  return [
    {
      code: `${card.key}_alert`,
      severity: card.severity,
      title: `${card.label} ${card.severity === 'critical' ? 'critical' : 'degrading'}`,
      description: card.description,
      action: genericActions[card.key] || 'Review operational logs.',
    },
  ];
}

export const METRICS_REGISTRY: MetricRegistryEntry[] = [
  {
    key: 'orders_created',
    label: 'Orders Created',
    compute: ordersCreatedCard,
    buildAlerts: (card) => buildDefaultAlerts(card),
  },
  {
    key: 'payment_success_rate',
    label: 'Payment Success Rate',
    compute: paymentSuccessCard,
    buildAlerts: (card) => buildDefaultAlerts(card),
  },
  {
    key: 'workflow_failure_rate',
    label: 'Workflow Failure Rate',
    compute: workflowFailureCard,
    buildAlerts: (card) => buildDefaultAlerts(card),
  },
  {
    key: 'avg_execution_time',
    label: 'Avg Execution Time',
    compute: averageExecutionCard,
    buildAlerts: (card) => buildDefaultAlerts(card),
  },
  {
    key: 'message_delivery_rate',
    label: 'Message Delivery Rate',
    compute: deliveryRateCard,
    buildAlerts: (card) => buildDefaultAlerts(card),
  },
];
