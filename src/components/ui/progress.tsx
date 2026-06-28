"use client";
import { cn } from "@/lib/utils/cn";

interface ProgressProps {
  value: number;
  max?: number;
  size?: "xs" | "sm" | "md" | "lg";
  variant?: "default" | "success" | "warning" | "destructive";
  showLabel?: boolean;
  label?: string;
  className?: string;
  animated?: boolean;
}

const sizeMap = { xs: "h-1", sm: "h-1.5", md: "h-2", lg: "h-3" };
const variantMap = {
  default: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
};

export function Progress({ value, max = 100, size = "md", variant = "default", showLabel, label, className, animated }: ProgressProps) {
  const pct = Math.min(Math.max((value / max) * 100, 0), 100);
  return (
    <div className={cn("space-y-1", className)}>
      {(showLabel || label) && (
        <div className="flex justify-between items-center text-xs text-foreground-muted">
          <span>{label ?? "Progresso"}</span>
          <span className="font-medium text-foreground">{Math.round(pct)}%</span>
        </div>
      )}
      <div className={cn("w-full rounded-full bg-muted overflow-hidden", sizeMap[size])}>
        <div
          className={cn("h-full rounded-full transition-all duration-500 ease-out", variantMap[variant], animated && "animate-pulse-soft")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
