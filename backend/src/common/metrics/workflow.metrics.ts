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
  ) {}

  incrementWorkflowRun(
    workflowId: string,
    organizationId: string,
    status: 'COMPLETED' | 'FAILED' | 'PENDING' | 'RUNNING',
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

  incrementWorkflowStep(stepType: string, status: 'COMPLETED' | 'FAILED' | 'RUNNING'): void {
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
}
