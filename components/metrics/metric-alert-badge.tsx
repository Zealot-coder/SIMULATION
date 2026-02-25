"use client";

import { AlertTriangle, ShieldAlert, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type AlertSeverity = "healthy" | "warning" | "critical";

interface MetricAlertBadgeProps {
  severity: AlertSeverity;
  label?: string;
  className?: string;
}

export function MetricAlertBadge({ severity, label, className }: MetricAlertBadgeProps) {
  if (severity === "healthy") {
    return (
      <Badge variant="success" className={cn("gap-1.5", className)}>
        <ShieldCheck className="h-3.5 w-3.5" />
        {label || "Healthy"}
      </Badge>
    );
  }

  if (severity === "warning") {
    return (
      <Badge variant="warning" className={cn("gap-1.5", className)}>
        <AlertTriangle className="h-3.5 w-3.5" />
        {label || "Warning"}
      </Badge>
    );
  }

  return (
    <Badge variant="destructive" className={cn("gap-1.5", className)}>
      <ShieldAlert className="h-3.5 w-3.5" />
      {label || "Critical"}
    </Badge>
  );
}
