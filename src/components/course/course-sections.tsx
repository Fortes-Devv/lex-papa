import Link from "next/link";
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, ClipboardCheck, Layers, Play, PlayCircle, Users } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { CdnImg } from "@/components/ui/cdn-img";

// Seções do curso: a tela inicial (aluno e admin) lista estas cinco. Só "Aulas e
// Materiais" tem conteúdo por enquanto; as outras abrem um aviso de "em breve".
export const COURSE_SECTIONS = [
  { id: "aulas", label: "Aulas e Materiais", hint: "Videoaulas e PDFs, por disciplina", icon: PlayCircle, ready: true, accent: "", bar: "" },
  // Cada seção tem a sua cor (ícone e faixa do hover). Classes inteiras para o Tailwind achar.
  { id: "flashcards", label: "FlashCards", hint: "Revisão rápida dos pontos-chave", icon: Layers, ready: false,
    accent: "bg-violet-100 text-violet-600 group-hover:bg-violet-600 dark:bg-violet-500/15 dark:text-violet-300", bar: "from-violet-500 to-fuchsia-500" },
  { id: "simulados", label: "Simulados", hint: "Provas no formato do concurso", icon: ClipboardCheck, ready: false,
    accent: "bg-emerald-100 text-emerald-600 group-hover:bg-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300", bar: "from-emerald-500 to-teal-500" },
  { id: "cronogramas", label: "Cronogramas", hint: "Plano de estudos semana a semana", icon: CalendarDays, ready: false,
    accent: "bg-sky-100 text-sky-600 group-hover:bg-sky-600 dark:bg-sky-500/15 dark:text-sky-300", bar: "from-sky-500 to-blue-500" },
  { id: "mentoria", label: "Mentoria", hint: "Acompanhamento com os professores", icon: Users, ready: false,
    accent: "bg-amber-100 text-amber-600 group-hover:bg-amber-500 dark:bg-amber-500/15 dark:text-amber-300", bar: "from-amber-400 to-brand" },
] as const;

export type CourseSectionId = (typeof COURSE_SECTIONS)[number]["id"];

export function parseCourseSection(value: string | undefined): CourseSectionId | null {
  return COURSE_SECTIONS.some((s) => s.id === value) ? (value as CourseSectionId) : null;
}

export type AulasSummary = {
  /** Linha de resumo: "12 disciplinas · 0% concluído". */
  detail: string;
  /** Progresso do aluno (0-100); sem ele, não mostra barra. */
  progress?: number;
  /** Próxima aula do aluno, com link direto para o player. */
  resume?: { href: string; label: string; sub?: string };
};

/**
 * As seções do curso em cartões: "Aulas e Materiais" em destaque (com progresso
 * e "continuar"), as demais lado a lado. `href(id)` monta o link de cada uma.
 */
export function CourseSectionList({ href, aulas }: { href: (id: CourseSectionId) => string; aulas: AulasSummary }) {
  const [main, ...rest] = COURSE_SECTIONS;
  const MainIcon = main.icon;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {/* Destaque: o cartão inteiro abre as aulas; "Continuar" vai direto para o player. */}
      <div className="group relative overflow-hidden rounded-[18px] bg-navy p-5 text-white shadow-[0_10px_30px_rgba(31,43,58,.18)] transition-transform duration-200 hover:-translate-y-0.5 sm:col-span-2 sm:p-6">
        <span aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand/25 blur-2xl transition-transform duration-500 group-hover:scale-125" />
        <span aria-hidden className="pointer-events-none absolute -bottom-20 right-24 h-40 w-40 rounded-full bg-white/5" />
        <div className="relative flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand shadow-[0_6px_16px_rgba(242,106,27,.4)] transition-transform duration-300 group-hover:rotate-[-6deg] group-hover:scale-110">
            <MainIcon className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <Link href={href(main.id)} className="text-[20px] font-extrabold leading-tight after:absolute after:inset-0 after:content-[''] sm:text-[22px]">
              {main.label}
            </Link>
            <p className="mt-0.5 text-[13px] text-white/65">{aulas.detail}</p>
          </div>
          <ArrowRight className="relative mt-1 h-5 w-5 shrink-0 text-white/50 transition-all duration-200 group-hover:translate-x-1 group-hover:text-white" />
        </div>

        {aulas.progress !== undefined && (
          <div className="relative mt-5">
            <div className="flex items-baseline justify-between text-xs">
              <span className="font-semibold text-white/70">Seu progresso</span>
              <span className="text-[15px] font-extrabold">{aulas.progress}%</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/15">
              <div className="h-full rounded-full bg-brand transition-all duration-700" style={{ width: `${Math.max(2, Math.min(100, aulas.progress))}%` }} />
            </div>
          </div>
        )}

        {aulas.resume && (
          <Link href={aulas.resume.href}
            className="relative z-10 mt-5 flex items-center gap-3 rounded-xl bg-white/10 p-3 ring-1 ring-white/10 transition-colors hover:bg-white/15">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand"><Play className="h-4 w-4 fill-current" /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-brand">{aulas.resume.label}</span>
              {aulas.resume.sub && <span className="block truncate text-[13.5px] font-semibold">{aulas.resume.sub}</span>}
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-white/60" />
          </Link>
        )}
      </div>

      {rest.map((s) => {
        const Icon = s.icon;
        return (
          <Link key={s.id} href={href(s.id)}
            className="group relative flex min-h-[176px] flex-col overflow-hidden rounded-[16px] border border-border bg-card p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_14px_32px_rgba(31,43,58,.12)]">
            <span aria-hidden className={cn("absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-gradient-to-r transition-transform duration-300 group-hover:scale-x-100", s.bar)} />
            <Icon aria-hidden className="pointer-events-none absolute -bottom-6 -right-6 h-28 w-28 text-foreground opacity-[0.04] transition-transform duration-500 group-hover:-rotate-12 group-hover:scale-110" />
            <div className="flex items-start justify-between gap-3">
              <span className={cn("grid h-11 w-11 place-items-center rounded-xl transition-all duration-300 group-hover:scale-110 group-hover:text-white", s.accent)}>
                <Icon className="h-5 w-5" />
              </span>
              {!s.ready && <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold text-foreground-muted">Em breve</span>}
            </div>
            <span className="mt-4 block text-[16px] font-bold text-foreground">{s.label}</span>
            <span className="mt-0.5 block text-[13px] leading-snug text-foreground-muted">{s.hint}</span>
            <span className="mt-auto inline-flex items-center gap-1 pt-4 text-[13px] font-semibold text-foreground-muted group-hover:text-foreground transition-all duration-200 group-hover:gap-2">
              {s.ready ? "Abrir" : "Ver novidades"} <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>
        );
      })}
    </div>
  );
}

/** Topo da tela de seções: a capa do curso ao fundo, o título e os números. */
export function CourseHubHeader({ thumbnail, eyebrow, title, stats }: { thumbnail: string | null; eyebrow: string; title: string; stats: { label: string; value: string }[] }) {
  return (
    <div className="relative overflow-hidden rounded-[18px] bg-navy-deep text-white">
      {thumbnail && <CdnImg src={thumbnail} width={640} alt="" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-30 blur-md" />}
      <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-navy-deep via-navy-deep/90 to-navy-deep/40" />
      <div className="relative flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
        {thumbnail && <CdnImg src={thumbnail} width={240} alt="" className="h-20 w-20 shrink-0 rounded-2xl object-cover shadow-lg ring-2 ring-white/15 sm:h-24 sm:w-24" />}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-brand">{eyebrow}</p>
          <h1 className="mt-1 text-[22px] font-extrabold leading-tight sm:text-[26px]">{title}</h1>
          <dl className="mt-3 flex flex-wrap gap-2">
            {stats.map((st) => (
              <div key={st.label} className="rounded-lg bg-white/10 px-3 py-1.5 ring-1 ring-white/10 backdrop-blur">
                <dt className="sr-only">{st.label}</dt>
                <dd className="text-[13px]"><span className="font-extrabold">{st.value}</span> <span className="text-white/65">{st.label}</span></dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
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
