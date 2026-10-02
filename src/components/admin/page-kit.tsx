import Link from "next/link";
import { cn } from "@/lib/utils/cn";

// Blocos visuais das páginas do admin (docs/Layout de módulos com preview, 00-shell):
// cabeçalho de página, card de métrica, card de tabela, selos e botões.

export function PageHeader({ title, subtitle, actions }: { title: React.ReactNode; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[22px] font-extrabold tracking-tight text-foreground">{title}</h1>
        {subtitle && <p className="mt-0.5 text-[13px] text-foreground-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function MetricCard({ label, value, hint, hintTone = "muted", dark = false, valueTone }: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  hintTone?: "muted" | "up" | "down" | "brand";
  dark?: boolean;
  valueTone?: "danger";
}) {
  const hintColor = { muted: dark ? "text-white/60" : "text-foreground-muted", up: "text-ok-text dark:text-ok", down: "text-danger", brand: dark ? "text-brand" : "text-brand-dark dark:text-brand" }[hintTone];
  return (
    <div className={cn("rounded-[14px] border p-[18px]", dark ? "border-navy bg-navy text-white" : "border-border bg-card")}>
      <p className={cn("text-[13px]", dark ? "text-white/70" : "text-foreground-muted")}>{label}</p>
      <p className={cn("mt-1.5 text-[26px] font-extrabold leading-tight tracking-tight", valueTone === "danger" ? "text-danger" : dark ? "text-white" : "text-foreground")}>{value}</p>
      {hint && <p className={cn("mt-1 text-[11.5px] font-medium", hintColor)}>{hint}</p>}
    </div>
  );
}

export function SectionCard({ title, action, children, className, bodyClassName }: { title?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; className?: string; bodyClassName?: string }) {
  return (
    <section className={cn("overflow-hidden rounded-[14px] border border-border bg-card", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 px-[18px] pb-2 pt-4">
          {title && <h2 className="text-sm font-bold text-foreground">{title}</h2>}
          {action}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

const PILL = {
  ok: "bg-ok-soft text-ok-text dark:bg-ok/15 dark:text-ok",
  brand: "bg-brand-soft text-brand-dark dark:bg-brand/15 dark:text-brand",
  gray: "bg-line-soft text-ink-2 dark:bg-white/10 dark:text-foreground-muted",
  danger: "bg-danger-soft text-danger dark:bg-danger/15",
} as const;

export function Pill({ tone = "gray", children, className }: { tone?: keyof typeof PILL; children: React.ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold leading-4", PILL[tone], className)}>{children}</span>;
}

const BTN = {
  primary: "bg-brand text-white hover:bg-brand-dark",
  dark: "bg-navy text-white hover:bg-navy-deep",
  ghost: "border border-line-strong bg-card text-foreground hover:bg-background dark:border-white/10",
} as const;

export function ButtonLink({ href, variant = "ghost", children, className, download }: { href: string; variant?: keyof typeof BTN; children: React.ReactNode; className?: string; download?: boolean }) {
  return (
    <Link href={href} download={download} prefetch={download ? false : undefined}
      className={cn("inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-3.5 text-[13px] font-semibold transition-colors", BTN[variant], className)}>
      {children}
    </Link>
  );
}

// Cabeçalho de tabela no estilo do spec (eyebrow em caixa alta).
export const tableHeadClass = "text-[10px] font-bold uppercase tracking-[1.2px] text-ink-faint";
