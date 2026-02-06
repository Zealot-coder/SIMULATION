"use client";

import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  delay?: number;
  className?: string;
  variant?: "default" | "large" | "compact";
}

export function FeatureCard({
  icon: Icon,
  title,
  description,
  delay = 0,
  className,
  variant = "default",
}: FeatureCardProps) {
  return (
    <div
      className={cn(
        "group relative rounded-xl border bg-card overflow-hidden",
        "transition-all duration-300 ease-out",
        "hover:shadow-lg hover:-translate-y-1",
        "animate-fade-up",
        variant === "large" && "p-8",
        variant === "default" && "p-6",
        variant === "compact" && "p-4",
        className
      )}
      style={{ animationDelay: `${delay * 100}ms` }}
    >
      {/* Hover gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative">
        {/* Icon container */}
        <div className={cn(
          "rounded-xl bg-primary/10 flex items-center justify-center mb-4",
          "transition-all duration-300 group-hover:bg-primary group-hover:scale-110",
          variant === "large" && "w-16 h-16",
          variant === "default" && "w-12 h-12",
          variant === "compact" && "w-10 h-10"
        )}>
          <Icon className={cn(
            "text-primary transition-colors duration-300 group-hover:text-primary-foreground",
            variant === "large" && "h-8 w-8",
            variant === "default" && "h-6 w-6",
            variant === "compact" && "h-5 w-5"
          )} />
        </div>

        {/* Content */}
        <h3 className={cn(
          "font-semibold mb-2 transition-colors group-hover:text-foreground",
          variant === "large" && "text-2xl",
          variant === "default" && "text-xl",
          variant === "compact" && "text-lg"
        )}>
          {title}
        </h3>
        <p className={cn(
          "text-muted-foreground leading-relaxed",
          variant === "large" && "text-base",
          variant === "default" && "text-sm",
          variant === "compact" && "text-xs"
        )}>
          {description}
        </p>
      </div>
    </div>
  );
}
