"use client";

import { cn } from "@/lib/utils";
import { 
  AlertCircle, 
  AlertTriangle, 
  XCircle, 
  Clock,
  ChevronRight,
  FileWarning,
  Workflow,
  CreditCard,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export type AttentionItemType = "workflow" | "payment" | "system" | "integration";
export type AttentionSeverity = "critical" | "warning" | "info";

export interface AttentionItem {
  id: string;
  type: AttentionItemType;
  severity: AttentionSeverity;
  title: string;
  description: string;
  timestamp?: string;
  action?: {
    label: string;
    href: string;
  };
}

interface NeedsAttentionPanelProps {
  items: AttentionItem[];
  className?: string;
  loading?: boolean;
  maxItems?: number;
}

const typeConfig = {
  workflow: { icon: Workflow, label: "Workflow" },
  payment: { icon: CreditCard, label: "Payment" },
  system: { icon: AlertCircle, label: "System" },
  integration: { icon: FileWarning, label: "Integration" },
};

const severityConfig = {
  critical: { 
    icon: XCircle, 
    color: "text-red-600 bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900 dark:text-red-400",
    badge: "Critical"
  },
  warning: { 
    icon: AlertTriangle, 
    color: "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900 dark:text-amber-400",
    badge: "Warning"
  },
  info: { 
    icon: Clock, 
    color: "text-sky-600 bg-sky-50 border-sky-200 dark:bg-sky-950/30 dark:border-sky-900 dark:text-sky-400",
    badge: "Info"
  },
};

export function NeedsAttentionPanel({ 
  items = [], 
  className, 
  loading = false,
  maxItems = 5
}: NeedsAttentionPanelProps) {
  const displayItems = items.slice(0, maxItems);
  const hasCritical = items.some(i => i.severity === "critical");

  if (loading) {
    return (
      <div className={cn("rounded-lg border bg-card shadow-sm overflow-hidden", className)}>
        <div className="p-4 border-b bg-muted/50">
          <div className="animate-shimmer h-5 w-32 rounded" />
        </div>
        <div className="p-4 space-y-3">
          <div className="animate-shimmer h-20 rounded" />
          <div className="animate-shimmer h-20 rounded" />
        </div>
      </div>
    );
  }

  // Empty state - all good
  if (items.length === 0) {
    return (
      <div className={cn("rounded-lg border bg-card shadow-sm overflow-hidden", className)}>
        <div className="p-4 border-b bg-muted/30">
          <h3 className="font-semibold">Needs Attention</h3>
        </div>
        <div className="p-6 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center mb-3">
            <svg className="h-6 w-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h4 className="text-sm font-medium mb-1">All systems operational</h4>
          <p className="text-xs text-muted-foreground">
            No issues requiring your attention
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "rounded-lg border bg-card shadow-sm overflow-hidden",
      hasCritical && "border-red-200 dark:border-red-900",
      className
    )}>
      {/* Header */}
      <div className={cn(
        "p-4 border-b flex items-center justify-between",
        hasCritical ? "bg-red-50/50 dark:bg-red-950/20" : "bg-muted/30"
      )}>
        <div className="flex items-center gap-2">
          {hasCritical ? (
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          )}
          <h3 className="font-semibold">Needs Attention</h3>
        </div>
        <span className={cn(
          "text-xs font-medium px-2 py-0.5 rounded-full",
          hasCritical 
            ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300" 
            : "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
        )}>
          {items.length} {items.length === 1 ? "issue" : "issues"}
        </span>
      </div>

      {/* Items List */}
      <div className="divide-y">
        {displayItems.map((item) => {
          const config = severityConfig[item.severity];
          const typeInfo = typeConfig[item.type];
          const Icon = config.icon;
          const TypeIcon = typeInfo.icon;
          
          return (
            <div 
              key={item.id}
              className={cn(
                "group p-4 transition-colors duration-150",
                "hover:bg-muted/30 cursor-pointer"
              )}
            >
              <div className="flex gap-3">
                {/* Severity Icon */}
                <div className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0",
                  config.color
                )}>
                  <Icon className="h-4 w-4" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{item.title}</p>
                        <span className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0",
                          config.color
                        )}>
                          {config.badge}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <TypeIcon className="h-3 w-3" />
                      <span>{typeInfo.label}</span>
                      {item.timestamp && (
                        <>
                          <span>•</span>
                          <span>{item.timestamp}</span>
                        </>
                      )}
                    </div>
                    
                    {item.action && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 text-xs gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        asChild
                      >
                        <Link href={item.action.href}>
                          {item.action.label}
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      {items.length > maxItems && (
        <div className="p-3 border-t bg-muted/20 text-center">
          <Button variant="ghost" size="sm" className="text-xs h-8">
            View all {items.length} issues
            <ChevronRight className="ml-1 h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}

// Compact version for inline display
interface NeedsAttentionBadgeProps {
  count: number;
  className?: string;
}

export function NeedsAttentionBadge({ count, className }: NeedsAttentionBadgeProps) {
  if (count === 0) return null;
  
  return (
    <span className={cn(
      "inline-flex items-center justify-center text-xs font-bold",
      "min-w-[20px] h-5 px-1.5 rounded-full",
      "bg-red-500 text-white",
      className
    )}>
      {count > 99 ? "99+" : count}
    </span>
  );
}
