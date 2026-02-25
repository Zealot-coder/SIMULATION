"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { RefreshCw, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AiAssistantPanel, type AiSuggestion } from "@/components/ai-assistant-panel";
import { MetricAlertBadge } from "@/components/metrics/metric-alert-badge";
import { MetricKpiCard, type DashboardMetricCard } from "@/components/metrics/metric-kpi-card";
import {
  OrdersPaymentsTrendChart,
  type OrdersPaymentsTrendPoint,
} from "@/components/metrics/orders-payments-trend-chart";
import { WorkflowHealthBreakdown } from "@/components/metrics/workflow-health-breakdown";
import { useOrgContext } from "@/contexts/org-context";
import { apiClient } from "@/lib/api-client";

type RangePreset = "today" | "7d" | "30d";

interface MetricsSummaryResponse {
  plan: {
    id: string;
    name: string;
  };
  kpis: DashboardMetricCard[];
  alerts: Array<{
    code: string;
    severity: "healthy" | "warning" | "critical";
    title: string;
    description: string;
    action: string;
  }>;
  systemHealth: {
    status: "healthy" | "warning" | "critical";
    alertCount: number;
  };
  generatedAt: string;
}

interface MetricsTrendsResponse {
  points: OrdersPaymentsTrendPoint[];
}

interface WorkflowHealthResponse {
  summary: {
    workflowsTotal: number;
    workflowsFailed: number;
    failureRate: number;
    previousFailureRate: number;
    failureRateDeltaPercent: number | null;
    retryCount: number;
    retryImpactPercent: number;
    dlqOpenCount: number;
  };
  healthStatus: "healthy" | "warning" | "critical";
  recentFailures: Array<{
    id: string;
    workflowId: string;
    workflowName: string;
    status: string;
    error: string | null;
    completedAt: string | null;
    safetyLimitCode: string | null;
  }>;
}

function toIsoRange(preset: RangePreset): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString();

  if (preset === "today") {
    const fromDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    return { from: fromDate.toISOString(), to };
  }

  if (preset === "7d") {
    const fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return { from: fromDate.toISOString(), to };
  }

  const fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  return { from: fromDate.toISOString(), to };
}

function relativeTime(iso: string | null): string {
  if (!iso) return "n/a";
  const target = new Date(iso).getTime();
  const diffMs = Date.now() - target;
  const minutes = Math.max(0, Math.floor(diffMs / (60 * 1000)));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function AppOverviewPage() {
  const { activeOrganization } = useOrgContext();
  const [preset, setPreset] = useState<RangePreset>("today");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<MetricsSummaryResponse | null>(null);
  const [trends, setTrends] = useState<MetricsTrendsResponse | null>(null);
  const [workflowHealth, setWorkflowHealth] = useState<WorkflowHealthResponse | null>(null);

  const fetchDashboard = useCallback(async () => {
    if (!activeOrganization?.organization_id) {
      setLoading(false);
      return;
    }

    const { from, to } = toIsoRange(preset);
    setLoading(true);
    setError(null);

    try {
      const [summaryResponse, trendsResponse, workflowHealthResponse] = await Promise.all([
        apiClient.getMetricsSummary({
          organizationId: activeOrganization.organization_id,
          from,
          to,
        }),
        apiClient.getMetricsTrends({
          organizationId: activeOrganization.organization_id,
          from,
          to,
          granularity: preset === "today" ? "hour" : "day",
        }),
        apiClient.getMetricsWorkflowHealth({
          organizationId: activeOrganization.organization_id,
          from,
          to,
          limit: 8,
        }),
      ]);

      setSummary(summaryResponse as MetricsSummaryResponse);
      setTrends(trendsResponse as MetricsTrendsResponse);
      setWorkflowHealth(workflowHealthResponse as WorkflowHealthResponse);
    } catch (err: any) {
      setError(err?.message || "Failed to load business metrics dashboard.");
    } finally {
      setLoading(false);
    }
  }, [activeOrganization?.organization_id, preset]);

  useEffect(() => {
    void fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    const timer = setInterval(() => {
      void fetchDashboard();
    }, 45_000);
    return () => clearInterval(timer);
  }, [fetchDashboard]);

  const kpiMap = useMemo(() => {
    if (!summary?.kpis) {
      return [];
    }
    const order = [
      "orders_created",
      "payment_success_rate",
      "workflow_failure_rate",
      "avg_execution_time",
      "message_delivery_rate",
    ];
    return order
      .map((key) => summary.kpis.find((item) => item.key === key))
      .filter((item): item is DashboardMetricCard => Boolean(item));
  }, [summary?.kpis]);

  const aiSuggestions = useMemo<AiSuggestion[]>(() => {
    if (!summary?.alerts?.length) {
      return [];
    }
    return summary.alerts.slice(0, 4).map((alert) => ({
      id: alert.code,
      type: alert.severity === "critical" ? "warning" : "improvement",
      title: alert.title,
      description: `${alert.description} ${alert.action}`,
    }));
  }, [summary?.alerts]);

  const aiSummary = useMemo(() => {
    if (!summary?.kpis?.length) {
      return undefined;
    }
    return {
      title: "Operational Snapshot",
      metrics: summary.kpis.slice(0, 4).map((metric) => ({
        label: metric.label,
        value:
          metric.unit === "percent"
            ? `${metric.value.toFixed(2)}%`
            : metric.unit === "seconds"
              ? `${metric.value.toFixed(2)}s`
              : metric.value.toLocaleString(),
        change:
          metric.deltaPercent === null
            ? undefined
            : `${metric.deltaPercent > 0 ? "+" : ""}${metric.deltaPercent.toFixed(2)}%`,
      })),
    };
  }, [summary?.kpis]);

  const trendPoints = trends?.points || [];
  const failures = workflowHealth?.recentFailures || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Business Intelligence Overview</h1>
          <p className="text-sm text-muted-foreground">
            {activeOrganization?.organization_name || "Organization"} operational health and automation metrics
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg border p-1">
            {([
              { key: "today", label: "Today" },
              { key: "7d", label: "7 Days" },
              { key: "30d", label: "30 Days" },
            ] as Array<{ key: RangePreset; label: string }>).map((item) => (
              <button
                key={item.key}
                type="button"
                className={`rounded-md px-3 py-1.5 text-xs transition ${
                  preset === item.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setPreset(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={() => void fetchDashboard()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">Org: {activeOrganization?.organization_name || "n/a"}</Badge>
        <Badge variant="outline">Plan: {summary?.plan?.name || "n/a"}</Badge>
        <MetricAlertBadge severity={summary?.systemHealth.status || "healthy"} label="System Health" />
        <Badge variant="outline">
          Alerts: {summary?.systemHealth.alertCount?.toLocaleString() || 0}
        </Badge>
      </div>

      {error && (
        <Card className="border-destructive/40">
          <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {loading
          ? Array.from({ length: 5 }).map((_, index) => (
              <Card key={`metric-skeleton-${index}`}>
                <CardContent className="pt-6">
                  <div className="h-5 w-24 animate-pulse rounded bg-muted" />
                  <div className="mt-3 h-8 w-20 animate-pulse rounded bg-muted" />
                </CardContent>
              </Card>
            ))
          : kpiMap.map((metric) => <MetricKpiCard key={metric.key} metric={metric} />)}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Orders and Payment Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <OrdersPaymentsTrendChart points={trendPoints} />
          </CardContent>
        </Card>
        <WorkflowHealthBreakdown
          summary={workflowHealth?.summary || null}
          healthStatus={workflowHealth?.healthStatus || "healthy"}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Failures</CardTitle>
            <Button size="sm" variant="outline" asChild>
              <Link href="/app/admin/dlq">
                <Zap className="mr-2 h-4 w-4" />
                Open DLQ
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {failures.length === 0 ? (
              <p className="text-sm text-muted-foreground">No failed workflows in selected range.</p>
            ) : (
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="py-2 pr-3">Workflow</th>
                      <th className="py-2 pr-3">Error</th>
                      <th className="py-2 pr-3">Safety Limit</th>
                      <th className="py-2">When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {failures.map((failure) => (
                      <tr key={failure.id} className="border-b align-top">
                        <td className="py-3 pr-3 font-medium">{failure.workflowName}</td>
                        <td className="py-3 pr-3 text-muted-foreground">
                          {failure.error || "No error payload"}
                        </td>
                        <td className="py-3 pr-3">
                          {failure.safetyLimitCode ? (
                            <Badge variant="warning">{failure.safetyLimitCode}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="py-3 text-muted-foreground">{relativeTime(failure.completedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <AiAssistantPanel summary={aiSummary} suggestions={aiSuggestions} />
      </div>

      <div className="text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Sparkles className="h-3.5 w-3.5" />
          Last updated: {summary?.generatedAt ? new Date(summary.generatedAt).toLocaleString() : "n/a"}
        </span>
      </div>
    </div>
  );
}
