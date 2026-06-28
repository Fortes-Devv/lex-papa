"use client";
import { createContext, useContext, useState } from "react";
import { cn } from "@/lib/utils/cn";

const TabsContext = createContext<{ active: string; setActive: (v: string) => void }>({ active: "", setActive: () => {} });

export function Tabs({ defaultValue, children, className }: { defaultValue: string; children: React.ReactNode; className?: string }) {
  const [active, setActive] = useState(defaultValue);
  return <TabsContext.Provider value={{ active, setActive }}><div className={className}>{children}</div></TabsContext.Provider>;
}

export function TabsList({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center gap-0 border-b border-border", className)}>
      {children}
    </div>
  );
}

export function TabsTrigger({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) {
  const { active, setActive } = useContext(TabsContext);
  const isActive = active === value;
  return (
    <button
      onClick={() => setActive(value)}
      className={cn(
        "relative px-4 py-2.5 text-sm font-medium transition-colors duration-150",
        "border-b-2 -mb-px",
        isActive ? "border-primary text-foreground" : "border-transparent text-foreground-muted hover:text-foreground hover:border-border",
        className
      )}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) {
  const { active } = useContext(TabsContext);
  if (active !== value) return null;
  return <div className={cn("animate-fade-in", className)}>{children}</div>;
}
