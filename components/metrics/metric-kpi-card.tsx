"use client";

import { Activity, Clock3, MessageSquare, ShoppingCart, Wallet } from "lucide-react";
import { KpiCard } from "@/components/kpi-card";
import { MetricAlertBadge, type AlertSeverity } from "@/components/metrics/metric-alert-badge";
import { cn } from "@/lib/utils";
import type { ComponentType } from "react";

export interface DashboardMetricCard {
  key: string;
  label: string;
  value: number;
  unit: "count" | "percent" | "seconds";
  trend: "up" | "down" | "flat";
  deltaPercent: number | null;
  severity: AlertSeverity;
  description: string;
}

interface MetricKpiCardProps {
  metric: DashboardMetricCard;
  className?: string;
}

const iconByMetric: Record<string, ComponentType<{ className?: string }>> = {
  orders_created: ShoppingCart,
  payment_success_rate: Wallet,
  workflow_failure_rate: Activity,
  avg_execution_time: Clock3,
  message_delivery_rate: MessageSquare,
};

function formatValue(metric: DashboardMetricCard): string {
  if (metric.unit === "percent") {
    return `${metric.value.toFixed(2)}%`;
  }
  if (metric.unit === "seconds") {
    return `${metric.value.toFixed(2)}s`;
  }
  return metric.value.toLocaleString();
}

function formatDelta(metric: DashboardMetricCard): string | undefined {
  if (metric.deltaPercent === null || !Number.isFinite(metric.deltaPercent)) {
    return undefined;
  }
  if (metric.deltaPercent === 0) {
    return "0%";
  }
  const sign = metric.deltaPercent > 0 ? "+" : "";
  return `${sign}${metric.deltaPercent.toFixed(2)}%`;
}

export function MetricKpiCard({ metric, className }: MetricKpiCardProps) {
  const Icon = iconByMetric[metric.key] || Activity;

  return (
    <div
      className={cn(
        "rounded-lg border p-0.5",
        metric.severity === "critical"
          ? "border-red-400/40"
          : metric.severity === "warning"
            ? "border-amber-400/40"
            : "border-border",
        className,
      )}
    >
      <KpiCard
        title={metric.label}
        value={formatValue(metric)}
        delta={formatDelta(metric)}
        trend={metric.trend}
        icon={Icon}
        subtitle={metric.description}
        className="border-0 shadow-none"
      />
      <div className="px-5 pb-4">
        <MetricAlertBadge severity={metric.severity} />
      </div>
    </div>
  );
}
