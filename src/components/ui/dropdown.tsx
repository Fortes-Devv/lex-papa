"use client";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";

type DropdownItem =
  | { separator: true; label?: never; icon?: never; onClick?: never; href?: never; variant?: never; disabled?: never }
  | { separator?: false; label: string; icon?: React.ReactNode; onClick?: () => void; href?: string; variant?: "default" | "destructive"; disabled?: boolean };

interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  align?: "left" | "right";
  className?: string;
}

export function Dropdown({ trigger, items, align = "right", className }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className={cn("relative inline-block", className)}>
      <div onClick={() => setOpen((o) => !o)}>{trigger}</div>
      {open && (
        <div
          className={cn(
            "absolute z-[1000] mt-1.5 min-w-[180px] rounded-lg border border-border bg-popover shadow-lg animate-slide-in-down py-1",
            align === "right" ? "right-0" : "left-0"
          )}
        >
          {items.map((item, i) => (
            item.separator ? (
              <div key={i} className="my-1 border-t border-border" />
            ) : (
              <button
                key={i}
                disabled={item.disabled}
                onClick={() => { item.onClick?.(); setOpen(false); }}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors duration-100",
                  "hover:bg-muted disabled:opacity-50 disabled:pointer-events-none",
                  item.variant === "destructive" ? "text-destructive" : "text-foreground"
                )}
              >
                {item.icon && <span className="text-foreground-muted">{item.icon}</span>}
                {item.label}
              </button>
            )
          ))}
        </div>
      )}
    </div>
  );
}
