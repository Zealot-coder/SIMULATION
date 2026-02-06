import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20",
        success:
          "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border border-emerald-500/20 dark:text-emerald-400",
        warning:
          "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border border-amber-500/20 dark:text-amber-400",
        info:
          "bg-sky-500/10 text-sky-600 hover:bg-sky-500/20 border border-sky-500/20 dark:text-sky-400",
        outline:
          "border border-border bg-background hover:bg-muted text-foreground",
        ghost:
          "hover:bg-muted text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

// Status Badge with animated dot
interface StatusBadgeProps extends BadgeProps {
  status: "running" | "success" | "failed" | "pending" | "idle" | "warning";
  showDot?: boolean;
}

const statusConfig = {
  running: { variant: "info" as const, label: "Running", dotColor: "bg-sky-500" },
  success: { variant: "success" as const, label: "Success", dotColor: "bg-emerald-500" },
  failed: { variant: "destructive" as const, label: "Failed", dotColor: "bg-red-500" },
  pending: { variant: "warning" as const, label: "Pending", dotColor: "bg-amber-500" },
  idle: { variant: "ghost" as const, label: "Idle", dotColor: "bg-gray-400" },
  warning: { variant: "warning" as const, label: "Warning", dotColor: "bg-amber-500" },
};

function StatusBadge({ 
  status, 
  showDot = true, 
  className, 
  children,
  ...props 
}: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <Badge 
      variant={config.variant} 
      className={cn("gap-1.5", className)}
      {...props}
    >
      {showDot && (
        <span 
          className={cn(
            "w-1.5 h-1.5 rounded-full",
            config.dotColor,
            status === "running" && "animate-pulse"
          )} 
        />
      )}
      {children || config.label}
    </Badge>
  );
}

export { Badge, StatusBadge, badgeVariants };
