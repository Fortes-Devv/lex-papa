import { cn } from "@/lib/utils/cn";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/utils/cn";
import type { AnalyticsMetric } from "@/lib/types";

interface StatCardProps {
  metric: AnalyticsMetric;
  format?: "number" | "currency" | "percent";
  icon?: React.ReactNode;
  className?: string;
}

export function StatCard({ metric, format = "number", icon, className }: StatCardProps) {
  const isUp = metric.trend === "up";
  const isDown = metric.trend === "down";

  const formatted =
    format === "currency"
      ? formatCurrency(metric.value)
      : format === "percent"
      ? `${metric.value.toFixed(1)}%`
      : formatNumber(metric.value);

  return (
    <div className={cn("rounded-lg border border-border bg-card p-5 flex flex-col gap-3", className)}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground-muted">{metric.label}</p>
        {icon && <div className="text-foreground-muted">{icon}</div>}
      </div>

      <div className="flex items-end justify-between gap-2">
        <p className="text-2xl font-semibold tracking-tight text-foreground">{formatted}</p>
        <div
          className={cn(
            "flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5",
            isUp && "text-success bg-success-muted",
            isDown && "text-destructive bg-destructive-muted",
            !isUp && !isDown && "text-foreground-muted bg-muted"
          )}
        >
          {isUp && <TrendingUp className="h-3 w-3" />}
          {isDown && <TrendingDown className="h-3 w-3" />}
          {!isUp && !isDown && <Minus className="h-3 w-3" />}
          {Math.abs(metric.change)}%
        </div>
      </div>

      <p className="text-xs text-foreground-subtle">vs. período anterior</p>
    </div>
  );
}
