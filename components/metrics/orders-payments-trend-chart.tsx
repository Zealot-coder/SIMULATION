"use client";

import { cn } from "@/lib/utils";

export interface OrdersPaymentsTrendPoint {
  bucketStart: string;
  ordersCreated: number;
  paymentSuccessRate: number;
}

interface OrdersPaymentsTrendChartProps {
  points: OrdersPaymentsTrendPoint[];
  className?: string;
}

function formatBucketLabel(iso: string): string {
  const date = new Date(iso);
  const hour = date.getUTCHours();
  const day = date.getUTCDate();
  const month = date.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  if (hour === 0) {
    return `${day} ${month}`;
  }
  return `${String(hour).padStart(2, "0")}:00`;
}

export function OrdersPaymentsTrendChart({ points, className }: OrdersPaymentsTrendChartProps) {
  const chartWidth = 860;
  const chartHeight = 220;
  const topPadding = 18;
  const bottomPadding = 26;
  const leftPadding = 20;
  const rightPadding = 20;
  const innerWidth = chartWidth - leftPadding - rightPadding;
  const innerHeight = chartHeight - topPadding - bottomPadding;

  if (!points.length) {
    return (
      <div
        className={cn(
          "h-[260px] rounded-lg border border-dashed flex items-center justify-center text-sm text-muted-foreground",
          className,
        )}
      >
        No trend data in selected range.
      </div>
    );
  }

  const maxOrders = Math.max(1, ...points.map((point) => point.ordersCreated));
  const stepX = points.length > 1 ? innerWidth / (points.length - 1) : innerWidth;
  const barWidth = Math.max(6, Math.min(24, innerWidth / Math.max(points.length, 1) - 4));

  const paymentPolyline = points
    .map((point, index) => {
      const x = leftPadding + index * stepX;
      const y = topPadding + innerHeight - (Math.max(0, Math.min(100, point.paymentSuccessRate)) / 100) * innerHeight;
      return `${x},${y}`;
    })
    .join(" ");

  const labels = points.length > 6
    ? points.filter((_, index) => index % Math.ceil(points.length / 6) === 0)
    : points;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm bg-sky-500" />
          Orders
        </div>
        <div className="inline-flex items-center gap-2">
          <span className="h-0.5 w-4 bg-emerald-500 rounded-full" />
          Payment success rate
        </div>
      </div>

      <div className="rounded-lg border bg-card/30 p-3">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-[220px]">
          <defs>
            <linearGradient id="ordersFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgb(56 189 248)" stopOpacity="0.6" />
              <stop offset="100%" stopColor="rgb(56 189 248)" stopOpacity="0.15" />
            </linearGradient>
          </defs>

          {[0, 25, 50, 75, 100].map((value) => {
            const y = topPadding + innerHeight - (value / 100) * innerHeight;
            return (
              <g key={value}>
                <line
                  x1={leftPadding}
                  x2={chartWidth - rightPadding}
                  y1={y}
                  y2={y}
                  stroke="currentColor"
                  className="text-border/60"
                  strokeWidth="1"
                />
                <text
                  x={chartWidth - rightPadding + 4}
                  y={y + 4}
                  className="fill-muted-foreground text-[10px]"
                >
                  {value}%
                </text>
              </g>
            );
          })}

          {points.map((point, index) => {
            const x = leftPadding + index * stepX;
            const barHeight = (point.ordersCreated / maxOrders) * innerHeight;
            const y = topPadding + innerHeight - barHeight;
            return (
              <rect
                key={`${point.bucketStart}-bar`}
                x={x - barWidth / 2}
                y={y}
                width={barWidth}
                height={Math.max(2, barHeight)}
                rx="2"
                fill="url(#ordersFill)"
              />
            );
          })}

          <polyline
            points={paymentPolyline}
            fill="none"
            stroke="rgb(34 197 94)"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {points.map((point, index) => {
            const x = leftPadding + index * stepX;
            const y = topPadding + innerHeight - (Math.max(0, Math.min(100, point.paymentSuccessRate)) / 100) * innerHeight;
            return (
              <circle
                key={`${point.bucketStart}-dot`}
                cx={x}
                cy={y}
                r="2.5"
                fill="rgb(34 197 94)"
              />
            );
          })}

          {labels.map((point) => {
            const index = points.findIndex((item) => item.bucketStart === point.bucketStart);
            const x = leftPadding + index * stepX;
            return (
              <text
                key={`${point.bucketStart}-label`}
                x={x}
                y={chartHeight - 4}
                textAnchor="middle"
                className="fill-muted-foreground text-[10px]"
              >
                {formatBucketLabel(point.bucketStart)}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
