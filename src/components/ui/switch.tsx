"use client";
import { cn } from "@/lib/utils/cn";

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  size?: "sm" | "md";
}

export function Switch({ checked, onChange, label, description, disabled, size = "md" }: SwitchProps) {
  return (
    <label className={cn("flex items-start gap-3 cursor-pointer", disabled && "opacity-50 cursor-not-allowed")}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative shrink-0 rounded-full border-2 border-transparent transition-all duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          size === "sm" ? "h-4 w-7" : "h-5 w-9",
          checked ? "bg-primary" : "bg-muted"
        )}
      >
        <span
          className={cn(
            "pointer-events-none block rounded-full bg-white shadow-sm transition-transform duration-200",
            size === "sm" ? "h-3 w-3" : "h-4 w-4",
            checked
              ? size === "sm" ? "translate-x-3" : "translate-x-4"
              : "translate-x-0"
          )}
        />
      </button>
      {(label || description) && (
        <div className="flex flex-col gap-0.5">
          {label && <span className="text-sm font-medium text-foreground leading-tight">{label}</span>}
          {description && <span className="text-xs text-foreground-muted">{description}</span>}
        </div>
      )}
    </label>
  );
}
