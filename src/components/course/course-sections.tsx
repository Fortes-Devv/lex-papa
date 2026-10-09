import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, ClipboardCheck, Layers, PlayCircle, Users } from "lucide-react";
import { cn } from "@/lib/utils/cn";

// Seções do curso: a tela inicial (aluno e admin) lista estas cinco. Só "Aulas e
// Materiais" tem conteúdo por enquanto; as outras abrem um aviso de "em breve".
export const COURSE_SECTIONS = [
  { id: "aulas", label: "Aulas e Materiais", hint: "Videoaulas e PDFs, por disciplina", icon: PlayCircle, ready: true },
  { id: "flashcards", label: "FlashCards", hint: "Revisão rápida dos pontos-chave", icon: Layers, ready: false },
  { id: "simulados", label: "Simulados", hint: "Provas no formato do concurso", icon: ClipboardCheck, ready: false },
  { id: "cronogramas", label: "Cronogramas", hint: "Plano de estudos semana a semana", icon: CalendarDays, ready: false },
  { id: "mentoria", label: "Mentoria", hint: "Acompanhamento com os professores", icon: Users, ready: false },
] as const;

export type CourseSectionId = (typeof COURSE_SECTIONS)[number]["id"];

export function parseCourseSection(value: string | undefined): CourseSectionId | null {
  return COURSE_SECTIONS.some((s) => s.id === value) ? (value as CourseSectionId) : null;
}

/** Lista das seções. `href(id)` monta o link de cada uma; `detail` põe um resumo embaixo (ex.: progresso). */
export function CourseSectionList({ href, detail }: { href: (id: CourseSectionId) => string; detail?: Partial<Record<CourseSectionId, string>> }) {
  return (
    <ul className="overflow-hidden rounded-[14px] border border-border bg-card divide-y divide-line-soft dark:divide-white/10">
      {COURSE_SECTIONS.map((s) => {
        const Icon = s.icon;
        return (
          <li key={s.id}>
            <Link href={href(s.id)} className="flex items-center gap-4 px-[18px] py-4 hover:bg-background">
              <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl",
                s.ready ? "bg-brand text-white" : "bg-brand-soft text-brand dark:bg-brand/15")}>
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-bold text-foreground">{s.label}</span>
                <span className="block truncate text-[13px] text-foreground-muted">{detail?.[s.id] ?? s.hint}</span>
              </span>
              {!s.ready && <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold text-foreground-muted">Em breve</span>}
              <ChevronRight className="h-4 w-4 shrink-0 text-foreground-muted" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Seção ainda sem conteúdo. */
export function CourseSectionSoon({ id, backHref }: { id: CourseSectionId; backHref: string }) {
  const s = COURSE_SECTIONS.find((x) => x.id === id)!;
  const Icon = s.icon;
  return (
    <div className="space-y-4">
      <BackToSections href={backHref} />
      <div className="rounded-[14px] border border-border bg-card p-10 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-soft text-brand dark:bg-brand/15"><Icon className="h-7 w-7" /></span>
        <h2 className="mt-4 text-[20px] font-extrabold text-foreground">{s.label}</h2>
        <p className="mt-1 text-sm text-foreground-muted">{s.hint}.</p>
        <p className="mt-4 inline-flex rounded-full bg-muted px-3 py-1 text-xs font-bold text-foreground-muted">Em breve</p>
      </div>
    </div>
  );
}

export function BackToSections({ href, className }: { href: string; className?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-1 text-sm font-semibold text-foreground-muted hover:text-foreground", className)}>
      <ChevronLeft className="h-4 w-4" /> Seções do curso
    </Link>
  );
}
