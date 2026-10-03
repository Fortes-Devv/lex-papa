import Link from "next/link";
import { Check, FileText } from "lucide-react";
import { CdnImg } from "@/components/ui/cdn-img";
import { cn } from "@/lib/utils/cn";

// Peças visuais da área do aluno (mesma linguagem do admin: capas navy, laranja, cards).

export function clock(seconds: number | null | undefined) {
  const s = Math.max(0, Math.round(seconds ?? 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

// "4h", "4h 20m", "52 min"
export function hours(seconds: number) {
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return m % 60 ? `${h}h ${m % 60}m` : `${h}h`;
}

export function initials(name: string | null | undefined) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

// Capa do módulo: imagem enviada ou navy com as iniciais do professor (ou o número).
export function ModuleCover({ cover, instructorName, number, done, pdf, className, size = "md" }: {
  cover: string | null; instructorName: string | null; number: number; done?: boolean; pdf?: boolean; className?: string; size?: "sm" | "md";
}) {
  const label = initials(instructorName) || String(number).padStart(2, "0");
  return (
    <div className={cn("relative overflow-hidden bg-navy", className)}>
      {cover ? (
        <CdnImg src={cover} width={size === "sm" ? 128 : 640} aspect="16:9" alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <span className={cn("absolute bottom-2 left-3 font-extrabold leading-none text-brand", size === "sm" ? "bottom-1.5 left-2 text-base" : "text-[28px] lg:text-[34px]")}>{label}</span>
      )}
      {done && <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-ok text-white"><Check className="h-3.5 w-3.5" /></span>}
      {pdf && !done && size === "md" && (
        <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-bold text-navy"><FileText className="h-3 w-3" /> PDF</span>
      )}
    </div>
  );
}

export function Bar({ value, className, tone = "brand" }: { value: number; className?: string; tone?: "brand" | "ok" | "light" }) {
  return (
    <div className={cn("h-1.5 overflow-hidden rounded-full", tone === "light" ? "bg-white/15" : "bg-line dark:bg-white/10", className)}>
      <div className={cn("h-full rounded-full transition-all", tone === "ok" ? "bg-ok" : "bg-brand")} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function Panel({ title, action, children, className }: { title?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-[14px] border border-border bg-card", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 px-[18px] pt-4">
          {title && <h2 className="text-[15px] font-bold text-foreground">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} scroll={false}
      className={cn("inline-flex h-8 shrink-0 items-center rounded-full border px-3.5 text-[13px] font-semibold transition-colors",
        active ? "border-navy bg-navy text-white dark:border-white dark:bg-white dark:text-navy" : "border-border bg-card text-foreground-muted hover:text-foreground")}>
      {children}
    </Link>
  );
}

export function playerHref(courseId: string, lessonId?: string) {
  return `/student/player?courseId=${courseId}${lessonId ? `&lessonId=${lessonId}` : ""}`;
}
