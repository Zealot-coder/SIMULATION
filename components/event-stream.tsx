"use client";

import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/badge";
import { 
  ChevronRight, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  MoreHorizontal,
  RefreshCw,
  FileText,
  User,
  MessageSquare,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";

export interface EventStreamItem {
  id: string;
  type: "workflow" | "payment" | "customer" | "message" | "system";
  title: string;
  description?: string;
  status: "running" | "success" | "failed" | "pending" | "idle";
  timestamp: string;
  metadata?: Record<string, string>;
}

interface EventStreamProps {
  items: EventStreamItem[];
  className?: string;
  loading?: boolean;
  onRefresh?: () => void;
  maxItems?: number;
}

const typeConfig = {
  workflow: { icon: Zap, label: "Workflow" },
  payment: { icon: FileText, label: "Payment" },
  customer: { icon: User, label: "Customer" },
  message: { icon: MessageSquare, label: "Message" },
  system: { icon: RefreshCw, label: "System" },
};

export function EventStream({ 
  items = [], 
  className, 
  loading = false,
  onRefresh,
  maxItems = 10
}: EventStreamProps) {
  const displayItems = items.slice(0, maxItems);

  if (loading) {
    return (
      <div className={cn("rounded-lg border bg-card shadow-sm overflow-hidden", className)}>
        <div className="p-4 border-b bg-muted/50 flex items-center justify-between">
          <div className="animate-shimmer h-5 w-32 rounded" />
          <div className="animate-shimmer h-8 w-8 rounded" />
        </div>
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="animate-shimmer h-10 w-10 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="animate-shimmer h-4 w-3/4 rounded" />
                <div className="animate-shimmer h-3 w-1/2 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("rounded-lg border bg-card shadow-sm overflow-hidden", className)}>
      {/* Header */}
      <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
        <div>
          <h3 className="font-semibold">What&apos;s Happening Now</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Recent activity across your organization
          </p>
        </div>
        {onRefresh && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Event List */}
      <div className="divide-y">
        {displayItems.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
            </div>
            <h4 className="text-sm font-medium mb-1">No recent events</h4>
            <p className="text-xs text-muted-foreground">
              Activity will appear here as your workflows run
            </p>
          </div>
        ) : (
          displayItems.map((item, index) => {
            const config = typeConfig[item.type];
            const Icon = config.icon;
            
            return (
              <div 
                key={item.id}
                className={cn(
                  "group p-4 flex items-start gap-3",
                  "transition-colors duration-150 hover:bg-muted/30",
                  "cursor-pointer"
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Icon */}
                <div className={cn(
                  "h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0",
                  "bg-muted transition-colors duration-200",
                  "group-hover:bg-primary/10"
                )}>
                  <Icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      {item.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {item.description}
                        </p>
                      )}
                    </div>
                    <StatusBadge status={item.status} className="flex-shrink-0" />
                  </div>

                  {/* Metadata */}
                  {(item.metadata || item.timestamp) && (
                    <div className="flex items-center gap-3 mt-2">
                      {item.timestamp && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {item.timestamp}
                        </span>
                      )}
                      {item.metadata && Object.entries(item.metadata).slice(0, 2).map(([key, value]) => (
                        <span key={key} className="text-xs text-muted-foreground">
                          {key}: <span className="font-medium">{value}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Arrow */}
                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      {items.length > maxItems && (
        <div className="p-3 border-t bg-muted/20 text-center">
          <Button variant="ghost" size="sm" className="text-xs h-8">
            View all {items.length} events
            <ChevronRight className="ml-1 h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}

// Compact event list for side panels
interface EventStreamCompactProps {
  items: Pick<EventStreamItem, "id" | "title" | "status" | "timestamp">[];
  className?: string;
}

export function EventStreamCompact({ items, className }: EventStreamCompactProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {items.map((item) => (
        <div 
          key={item.id}
          className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50 transition-colors"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm truncate">{item.title}</p>
            <p className="text-xs text-muted-foreground">{item.timestamp}</p>
          </div>
          <StatusBadge status={item.status} className="flex-shrink-0 ml-2" />
        </div>
      ))}
    </div>
  );
}
