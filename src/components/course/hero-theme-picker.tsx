"use client";
import { Check } from "lucide-react";
import { HERO_THEMES, HERO_THEME_KEYS, type HeroThemeKey } from "@/lib/constants/hero-themes";
import { cn } from "@/lib/utils/cn";

export function HeroThemePicker({ value, onChange }: { value: string; onChange: (key: HeroThemeKey) => void }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-foreground">Cor de fundo do curso</label>
      <p className="mb-2 text-xs text-foreground-muted">Aparece no topo da página de venda do curso.</p>
      <div className="flex flex-wrap gap-2.5">
        {HERO_THEME_KEYS.map((key) => {
          const theme = HERO_THEMES[key];
          const active = value === key;
          return (
            <button
              key={key}
              type="button"
              title={theme.label}
              onClick={() => onChange(key)}
              className={cn(
                "relative h-11 w-11 rounded-lg border-2 transition-all",
                active ? "border-primary ring-2 ring-primary/30 scale-105" : "border-border hover:border-primary/40"
              )}
              style={{ background: theme.gradient }}
            >
              {active && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <Check className="h-4 w-4 text-white drop-shadow" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
