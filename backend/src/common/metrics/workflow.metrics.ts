import { Injectable } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Gauge, Histogram } from 'prom-client';

@Injectable()
export class WorkflowMetrics {
  constructor(
    @InjectMetric('workflow_runs_total')
    readonly workflowRunsTotal: Counter<'workflow_id' | 'status' | 'organization_id'>,
    @InjectMetric('workflow_steps_total')
    readonly workflowStepsTotal: Counter<'step_type' | 'status'>,
    @InjectMetric('events_ingested_total')
    readonly eventsIngestedTotal: Counter<'event_type' | 'organization_id'>,
    @InjectMetric('workflow_run_duration_seconds')
    readonly workflowRunDurationSeconds: Histogram<'workflow_id'>,
    @InjectMetric('workflow_step_duration_seconds')
    readonly workflowStepDurationSeconds: Histogram<'step_type'>,
    @InjectMetric('http_request_duration_seconds')
    readonly httpRequestDurationSeconds: Histogram<'method' | 'route' | 'status_code'>,
    @InjectMetric('active_workflow_runs')
    readonly activeWorkflowRuns: Gauge<'organization_id'>,
    @InjectMetric('queue_depth')
    readonly queueDepth: Gauge<'queue_name'>,
    @InjectMetric('workflow_step_attempts_total')
    readonly workflowStepAttemptsTotal: Counter<'step_type' | 'organization_id'>,
    @InjectMetric('workflow_step_retries_total')
    readonly workflowStepRetriesTotal: Counter<'step_type' | 'error_category' | 'organization_id'>,
    @InjectMetric('workflow_dlq_moves_total')
    readonly workflowDlqMovesTotal: Counter<'step_type' | 'error_category' | 'organization_id'>,
    @InjectMetric('workflow_dlq_replays_total')
    readonly workflowDlqReplaysTotal: Counter<'result' | 'organization_id'>,
    @InjectMetric('idempotency_hit')
    readonly idempotencyHit: Counter<'scope' | 'result'>,
    @InjectMetric('idempotency_miss')
    readonly idempotencyMiss: Counter<'scope'>,
    @InjectMetric('webhook_duplicate')
    readonly webhookDuplicate: Counter<'provider' | 'organization_id'>,
    @InjectMetric('step_duplicate')
    readonly stepDuplicate: Counter<'reason' | 'organization_id'>,
    @InjectMetric('payment_duplicate')
    readonly paymentDuplicate: Counter<'scope' | 'organization_id'>,
  ) {}

  incrementWorkflowRun(
    workflowId: string,
    organizationId: string,
    status:
      | 'SUCCESS'
      | 'FAILED'
      | 'PENDING'
      | 'RUNNING'
      | 'PARTIAL'
      | 'DLQ_PENDING'
      | 'PAUSED'
      | 'WAITING_APPROVAL',
  ): void {
    this.workflowRunsTotal.inc({
      workflow_id: workflowId,
      status,
      organization_id: organizationId,
    });
  }

  observeWorkflowRunDuration(workflowId: string, durationSeconds: number): void {
    this.workflowRunDurationSeconds.observe({ workflow_id: workflowId }, durationSeconds);
  }

  incrementWorkflowStep(
    stepType: string,
    status: 'SUCCESS' | 'FAILED' | 'RUNNING' | 'RETRYING' | 'DLQ' | 'PENDING' | 'SKIPPED',
  ): void {
    this.workflowStepsTotal.inc({ step_type: stepType, status });
  }

  observeWorkflowStepDuration(stepType: string, durationSeconds: number): void {
    this.workflowStepDurationSeconds.observe({ step_type: stepType }, durationSeconds);
  }

  incrementEventIngested(eventType: string, organizationId: string): void {
    this.eventsIngestedTotal.inc({
      event_type: eventType,
      organization_id: organizationId,
    });
  }

  setActiveWorkflowRuns(organizationId: string, count: number): void {
    this.activeWorkflowRuns.set({ organization_id: organizationId }, count);
  }

  setQueueDepth(queueName: string, depth: number): void {
    this.queueDepth.set({ queue_name: queueName }, depth);
  }

  incrementWorkflowStepAttempt(stepType: string, organizationId: string): void {
    this.workflowStepAttemptsTotal.inc({
      step_type: stepType,
      organization_id: organizationId,
    });
  }

  incrementWorkflowStepRetry(stepType: string, errorCategory: string, organizationId: string): void {
    this.workflowStepRetriesTotal.inc({
      step_type: stepType,
      error_category: errorCategory,
      organization_id: organizationId,
    });
  }

  incrementWorkflowDlqMove(stepType: string, errorCategory: string, organizationId: string): void {
    this.workflowDlqMovesTotal.inc({
      step_type: stepType,
      error_category: errorCategory,
      organization_id: organizationId,
    });
  }

  incrementWorkflowDlqReplay(result: 'success' | 'failed', organizationId: string): void {
    this.workflowDlqReplaysTotal.inc({
      result,
      organization_id: organizationId,
    });
  }

  incrementIdempotencyHit(scope: string, result: string): void {
    this.idempotencyHit.inc({
      scope,
      result,
    });
  }

  incrementIdempotencyMiss(scope: string): void {
    this.idempotencyMiss.inc({
      scope,
    });
  }

  incrementWebhookDuplicate(provider: string, organizationId: string): void {
    this.webhookDuplicate.inc({
      provider,
      organization_id: organizationId,
    });
  }

  incrementStepDuplicate(reason: string, organizationId: string): void {
    this.stepDuplicate.inc({
      reason,
      organization_id: organizationId,
    });
  }

  incrementPaymentDuplicate(scope: string, organizationId: string): void {
    this.paymentDuplicate.inc({
      scope,
      organization_id: organizationId,
    });
  }
}
