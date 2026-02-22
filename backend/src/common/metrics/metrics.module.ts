import { Global, Module } from '@nestjs/common';
import {
  makeCounterProvider,
  makeGaugeProvider,
  makeHistogramProvider,
  PrometheusModule,
} from '@willsoto/nestjs-prometheus';
import { WorkflowMetrics } from './workflow.metrics';

@Global()
@Module({
  imports: [
    PrometheusModule.register({
      defaultMetrics: {
        enabled: true,
      },
      path: '/metrics',
    }),
  ],
  providers: [
    makeCounterProvider({
      name: 'workflow_runs_total',
      help: 'Total number of workflow runs',
      labelNames: ['workflow_id', 'status', 'organization_id'],
    }),
    makeCounterProvider({
      name: 'workflow_steps_total',
      help: 'Total number of workflow steps executed',
      labelNames: ['step_type', 'status'],
    }),
    makeCounterProvider({
      name: 'events_ingested_total',
      help: 'Total number of events ingested',
      labelNames: ['event_type', 'organization_id'],
    }),
    makeHistogramProvider({
      name: 'workflow_run_duration_seconds',
      help: 'Workflow run duration in seconds',
      labelNames: ['workflow_id'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120, 300],
    }),
    makeHistogramProvider({
      name: 'workflow_step_duration_seconds',
      help: 'Workflow step duration in seconds',
      labelNames: ['step_type'],
      buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 30, 60],
    }),
    makeHistogramProvider({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.3, 0.5, 1, 3, 5, 10],
    }),
    makeGaugeProvider({
      name: 'active_workflow_runs',
      help: 'Current number of active workflow runs',
      labelNames: ['organization_id'],
    }),
    makeGaugeProvider({
      name: 'queue_depth',
      help: 'Current queue depth by queue name',
      labelNames: ['queue_name'],
    }),
    makeCounterProvider({
      name: 'workflow_step_attempts_total',
      help: 'Total number of workflow step attempts',
      labelNames: ['step_type', 'organization_id'],
    }),
    makeCounterProvider({
      name: 'workflow_step_retries_total',
      help: 'Total number of workflow retries',
      labelNames: ['step_type', 'error_category', 'organization_id'],
    }),
    makeCounterProvider({
      name: 'workflow_dlq_moves_total',
      help: 'Total number of workflow steps moved to DLQ',
      labelNames: ['step_type', 'error_category', 'organization_id'],
    }),
    makeCounterProvider({
      name: 'workflow_dlq_replays_total',
      help: 'Total number of DLQ replay outcomes',
      labelNames: ['result', 'organization_id'],
    }),
    makeCounterProvider({
      name: 'idempotency_hit',
      help: 'Idempotency cache hits by scope and decision',
      labelNames: ['scope', 'result'],
    }),
    makeCounterProvider({
      name: 'idempotency_miss',
      help: 'Idempotency misses by scope',
      labelNames: ['scope'],
    }),
    makeCounterProvider({
      name: 'webhook_duplicate',
      help: 'Duplicate webhook requests detected',
      labelNames: ['provider', 'organization_id'],
    }),
    makeCounterProvider({
      name: 'step_duplicate',
      help: 'Duplicate step executions detected',
      labelNames: ['reason', 'organization_id'],
    }),
    makeCounterProvider({
      name: 'payment_duplicate',
      help: 'Duplicate payment signals detected',
      labelNames: ['scope', 'organization_id'],
    }),
    WorkflowMetrics,
  ],
  exports: [WorkflowMetrics, PrometheusModule],
})
export class MetricsModule {}
