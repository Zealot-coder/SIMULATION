"use client";

import { cn } from "@/lib/utils";
import { 
  Sparkles, 
  Lightbulb, 
  AlertTriangle, 
  CheckCircle2,
  ChevronRight,
  Zap,
  TrendingUp,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";

export interface AiSuggestion {
  id: string;
  type: "improvement" | "warning" | "tip" | "success";
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface AiAssistantPanelProps {
  summary?: {
    title: string;
    metrics: { label: string; value: string; change?: string }[];
  };
  suggestions?: AiSuggestion[];
  className?: string;
  loading?: boolean;
}

const typeConfig = {
  improvement: { 
    icon: Lightbulb, 
    color: "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900 dark:text-amber-400",
    iconBg: "bg-amber-100 dark:bg-amber-900/50"
  },
  warning: { 
    icon: AlertTriangle, 
    color: "text-red-600 bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900 dark:text-red-400",
    iconBg: "bg-red-100 dark:bg-red-900/50"
  },
  tip: { 
    icon: Sparkles, 
    color: "text-sky-600 bg-sky-50 border-sky-200 dark:bg-sky-950/30 dark:border-sky-900 dark:text-sky-400",
    iconBg: "bg-sky-100 dark:bg-sky-900/50"
  },
  success: { 
    icon: CheckCircle2, 
    color: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900 dark:text-emerald-400",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/50"
  },
};

export function AiAssistantPanel({ 
  summary, 
  suggestions = [], 
  className,
  loading = false 
}: AiAssistantPanelProps) {
  if (loading) {
    return (
      <div className={cn("rounded-lg border bg-card shadow-sm overflow-hidden", className)}>
        <div className="p-4 border-b bg-muted/50">
          <div className="animate-shimmer h-5 w-32 rounded" />
        </div>
        <div className="p-4 space-y-3">
          <div className="animate-shimmer h-16 rounded" />
          <div className="animate-shimmer h-16 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "rounded-lg border bg-card shadow-sm overflow-hidden",
      className
    )}>
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <h3 className="font-semibold text-sm">AI Assistant</h3>
        </div>
      </div>

      {/* Daily Summary */}
      {summary && (
        <div className="p-4 border-b">
          <h4 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">
            {summary.title}
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {summary.metrics.map((metric, i) => (
              <div key={i} className="rounded-md bg-muted/50 p-2.5">
                <p className="text-xs text-muted-foreground">{metric.label}</p>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-sm font-semibold">{metric.value}</span>
                  {metric.change && (
                    <span className={cn(
                      "text-xs",
                      metric.change.startsWith("+") ? "text-emerald-600" : "text-red-600"
                    )}>
                      {metric.change}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="p-4 space-y-3">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Suggestions
          </h4>
          {suggestions.map((suggestion) => {
            const config = typeConfig[suggestion.type];
            const Icon = config.icon;
            
            return (
              <div 
                key={suggestion.id}
                className={cn(
                  "group rounded-lg border p-3 transition-all duration-200",
                  "hover:shadow-sm cursor-pointer",
                  config.color
                )}
              >
                <div className="flex gap-3">
                  <div className={cn("h-8 w-8 rounded-md flex items-center justify-center flex-shrink-0", config.iconBg)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="text-sm font-medium mb-0.5">{suggestion.title}</h5>
                    <p className="text-xs opacity-90 line-clamp-2">{suggestion.description}</p>
                    {suggestion.action && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="mt-2 h-7 text-xs px-2 -ml-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          suggestion.action?.onClick();
                        }}
                      >
                        {suggestion.action.label}
                        <ChevronRight className="ml-0.5 h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!summary && suggestions.length === 0 && (
        <div className="p-8 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <Sparkles className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            AI insights will appear here based on your activity
          </p>
        </div>
      )}
    </div>
  );
}

// Quick Stats Card for AI insights
interface AiQuickStatsProps {
  stats: {
    icon: React.ElementType;
    label: string;
    value: string;
    trend?: "up" | "down";
  }[];
  className?: string;
}

export function AiQuickStats({ stats, className }: AiQuickStatsProps) {
  return (
    <div className={cn("grid grid-cols-3 gap-2", className)}>
      {stats.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <div 
            key={i} 
            className={cn(
              "rounded-lg border bg-card p-3 text-center",
              "transition-all duration-200 hover:shadow-sm"
            )}
          >
            <Icon className="h-4 w-4 mx-auto mb-1.5 text-muted-foreground" />
            <p className="text-lg font-semibold">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        );
      })}
    </div>
  );
}
