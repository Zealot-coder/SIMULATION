"use client";

import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, LucideIcon, Minus } from "lucide-react";

export interface KpiCardProps {
  title: string;
  value: string | number;
  delta?: string;
  deltaType?: "positive" | "negative" | "neutral";
  icon?: LucideIcon;
  subtitle?: string;
  className?: string;
  trend?: "up" | "down" | "flat";
  loading?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export function KpiCard({ 
  title, 
  value, 
  delta, 
  deltaType = "neutral",
  icon: Icon,
  subtitle,
  className,
  trend,
  loading = false,
  onClick,
  style,
}: KpiCardProps) {
  if (loading) {
    return (
      <div className={cn(
        "rounded-lg border bg-card p-5 shadow-sm",
        className
      )}>
        <div className="animate-shimmer h-4 w-20 rounded mb-3" />
        <div className="animate-shimmer h-8 w-24 rounded" />
      </div>
    );
  }

  const TrendIcon = trend === "up" ? ArrowUpRight : trend === "down" ? ArrowDownRight : Minus;
  const trendColor = trend === "up" 
    ? "text-emerald-600 dark:text-emerald-400" 
    : trend === "down" 
    ? "text-red-600 dark:text-red-400" 
    : "text-muted-foreground";

  return (
    <div 
      onClick={onClick}
      style={style}
      className={cn(
        "group rounded-lg border bg-card p-5 shadow-sm",
        "transition-all duration-200 ease-out",
        "hover:shadow-md hover:-translate-y-0.5",
        onClick && "cursor-pointer",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-semibold tracking-tight">{value}</h3>
            {(delta || trend) && (
              <div className={cn("flex items-center text-xs font-medium", trendColor)}>
                <TrendIcon className="h-3 w-3 mr-0.5" />
                {delta}
              </div>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {Icon && (
          <div className={cn(
            "rounded-lg p-2.5 transition-colors duration-200",
            "bg-primary/10 text-primary",
            "group-hover:bg-primary group-hover:text-primary-foreground"
          )}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
}

// Compact KPI card for dense layouts
export function KpiCardCompact({ 
  title, 
  value, 
  delta,
  deltaType = "neutral",
  className,
}: Omit<KpiCardProps, "icon" | "subtitle" | "trend" | "loading" | "onClick">) {
  const deltaColor = deltaType === "positive" 
    ? "text-emerald-600 dark:text-emerald-400" 
    : deltaType === "negative" 
    ? "text-red-600 dark:text-red-400" 
    : "text-muted-foreground";

  return (
    <div className={cn(
      "rounded-md border bg-card p-3",
      "transition-shadow duration-200 hover:shadow-sm",
      className
    )}>
      <p className="text-xs text-muted-foreground mb-1">{title}</p>
      <div className="flex items-baseline gap-2">
        <span className="text-lg font-semibold">{value}</span>
        {delta && (
          <span className={cn("text-xs", deltaColor)}>
            {delta}
          </span>
        )}
      </div>
    </div>
  );
}

// KPI Group for related metrics
interface KpiGroupProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function KpiGroup({ title, children, className }: KpiGroupProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {title && (
        <h4 className="text-sm font-medium text-muted-foreground px-1">{title}</h4>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {children}
      </div>
    </div>
  );
}
