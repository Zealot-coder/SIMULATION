"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricAlertBadge } from "@/components/metrics/metric-alert-badge";

interface WorkflowHealthBreakdownProps {
  summary: {
    workflowsTotal: number;
    workflowsFailed: number;
    failureRate: number;
    previousFailureRate: number;
    failureRateDeltaPercent: number | null;
    retryCount: number;
    retryImpactPercent: number;
    dlqOpenCount: number;
  } | null;
  healthStatus: "healthy" | "warning" | "critical";
}

export function WorkflowHealthBreakdown({ summary, healthStatus }: WorkflowHealthBreakdownProps) {
  if (!summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Workflow Health</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">No workflow health data available.</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle>Workflow Health</CardTitle>
        <MetricAlertBadge severity={healthStatus} />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border bg-card/40 p-3">
            <p className="text-xs text-muted-foreground">Failure Rate</p>
            <p className="mt-1 text-xl font-semibold">{summary.failureRate.toFixed(2)}%</p>
            <p className="text-xs text-muted-foreground">
              {summary.workflowsFailed}/{summary.workflowsTotal} failed
            </p>
          </div>
          <div className="rounded-lg border bg-card/40 p-3">
            <p className="text-xs text-muted-foreground">Retry Impact</p>
            <p className="mt-1 text-xl font-semibold">{summary.retryImpactPercent.toFixed(2)}%</p>
            <p className="text-xs text-muted-foreground">{summary.retryCount} retried steps</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border bg-card/40 p-3">
            <p className="text-xs text-muted-foreground">Open DLQ Items</p>
            <p className="mt-1 text-xl font-semibold">{summary.dlqOpenCount.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Awaiting replay or resolution</p>
          </div>
          <div className="rounded-lg border bg-card/40 p-3">
            <p className="text-xs text-muted-foreground">Failure Delta</p>
            <p className="mt-1 text-xl font-semibold">
              {summary.failureRateDeltaPercent === null
                ? "n/a"
                : `${summary.failureRateDeltaPercent > 0 ? "+" : ""}${summary.failureRateDeltaPercent.toFixed(2)}%`}
            </p>
            <p className="text-xs text-muted-foreground">
              Previous: {summary.previousFailureRate.toFixed(2)}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
