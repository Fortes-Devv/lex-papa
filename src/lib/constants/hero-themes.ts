// Temas de fundo (gradiente) para o hero da página do curso.
// O admin escolhe um deles ao criar/editar o curso; o valor (chave) fica salvo
// em Course.heroColor e é aplicado como background inline no hero.

export const HERO_THEMES = {
  navy:     { label: "Azul-marinho", gradient: "linear-gradient(135deg,#0f2540 0%,#1b3559 55%,#24466e 100%)", swatch: "#1b3559" },
  graphite: { label: "Grafite",      gradient: "linear-gradient(135deg,#111827 0%,#1f2937 55%,#374151 100%)", swatch: "#1f2937" },
  orange:   { label: "Laranja LEX",  gradient: "linear-gradient(135deg,#7c2d12 0%,#b8460f 55%,#ea580c 100%)", swatch: "#c2410c" },
  emerald:  { label: "Esmeralda",    gradient: "linear-gradient(135deg,#064e3b 0%,#065f46 55%,#0f766e 100%)", swatch: "#065f46" },
  violet:   { label: "Violeta",      gradient: "linear-gradient(135deg,#2e1065 0%,#4c1d95 55%,#6d28d9 100%)", swatch: "#4c1d95" },
  crimson:  { label: "Vinho",        gradient: "linear-gradient(135deg,#4c0519 0%,#7f1d3a 55%,#be123c 100%)", swatch: "#881337" },
} as const;

export type HeroThemeKey = keyof typeof HERO_THEMES;

export const HERO_THEME_KEYS = Object.keys(HERO_THEMES) as HeroThemeKey[];

export function heroGradient(key?: string | null): string {
  const theme = (HERO_THEMES as Record<string, { gradient: string }>)[key ?? "navy"];
  return theme?.gradient ?? HERO_THEMES.navy.gradient;
}
