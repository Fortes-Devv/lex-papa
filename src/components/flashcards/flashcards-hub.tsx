import Link from "next/link";
import { Brain, CalendarClock, Flame, Layers, Play, RotateCcw, Shuffle, Sparkles, Target, Trophy } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { DeckSummary, FlashcardsOverview } from "@/lib/flashcards/queries";

const studyHref = (courseId: string, deckId?: string, mode?: string) =>
  `/student/flashcards?courseId=${courseId}${deckId ? `&deck=${deckId}` : ""}${mode ? `&modo=${mode}` : ""}`;

/**
 * FlashCards do aluno: a revisão do dia em destaque, os números (para revisar,
 * novos, dominados) e um cartão por baralho com o anel de domínio.
 */
export function FlashcardsHub({ courseId, overview, streak }: { courseId: string; overview: FlashcardsOverview; streak: number }) {
  const { decks, totals } = overview;

  if (decks.length === 0) {
    return (
      <div className="rounded-[18px] border border-dashed border-border bg-card p-10 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300"><Layers className="h-7 w-7" /></span>
        <h2 className="mt-4 text-[20px] font-extrabold text-foreground">Os flashcards estão a caminho</h2>
        <p className="mt-1 text-sm text-foreground-muted">Os professores estão preparando os baralhos deste curso. Assim que saírem, aparecem aqui.</p>
      </div>
    );
  }

  const today = totals.due + Math.min(totals.fresh, 20);
  const accuracyToday = overview.reviewedToday ? Math.round((overview.correctToday / overview.reviewedToday) * 100) : null;

  return (
    <div className="space-y-4">
      {/* Revisão do dia */}
      <div className="relative overflow-hidden rounded-[20px] bg-gradient-to-br from-violet-700 via-violet-600 to-fuchsia-600 p-5 text-white shadow-[0_14px_40px_rgba(124,58,237,.30)] sm:p-6">
        <span aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-52 w-52 rounded-full bg-white/10 blur-xl" />
        {/* Pilha de cartões decorativa */}
        <div aria-hidden className="pointer-events-none absolute -bottom-6 right-4 hidden sm:block">
          <span className="absolute bottom-0 right-16 h-28 w-20 rotate-[-14deg] rounded-xl bg-white/10 ring-1 ring-white/20" />
          <span className="absolute bottom-2 right-8 h-28 w-20 rotate-[-4deg] rounded-xl bg-white/15 ring-1 ring-white/25" />
          <span className="relative block h-28 w-20 rotate-[8deg] rounded-xl bg-white/90 shadow-xl"><Brain className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-violet-600" /></span>
        </div>
        <div className="relative max-w-md">
          <p className="text-[11px] font-bold uppercase tracking-wider text-white/75">Revisão do dia</p>
          <h2 className="mt-1 text-[26px] font-black leading-tight sm:text-[30px]">
            {today > 0 ? `${today} cart${today !== 1 ? "ões" : "ão"} para hoje` : "Tudo revisado!"}
          </h2>
          <p className="mt-1 text-[13px] text-white/80">
            {today > 0
              ? `${totals.due} para revisar${totals.fresh ? ` · ${Math.min(totals.fresh, 20)} novos` : ""}. A revisão espaçada traz cada cartão na hora em que você ia esquecer.`
              : "Você está em dia. Volte amanhã ou faça um treino livre."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={studyHref(courseId, undefined, today > 0 ? undefined : "tudo")}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-extrabold text-violet-700 shadow-lg transition hover:-translate-y-0.5">
              <Play className="h-4 w-4 fill-current" /> {today > 0 ? "Começar revisão" : "Treino livre"}
            </Link>
            {totals.mistakes > 0 && (
              <Link href={studyHref(courseId, undefined, "erros")} className="inline-flex h-11 items-center gap-2 rounded-xl bg-white/15 px-4 text-sm font-bold ring-1 ring-white/25 transition hover:bg-white/25">
                <RotateCcw className="h-4 w-4" /> Revisar meus {totals.mistakes} erros
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Números */}
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={<CalendarClock className="h-4 w-4" />} tone="bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300" value={totals.due} label="para revisar" />
        <Stat icon={<Sparkles className="h-4 w-4" />} tone="bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300" value={totals.fresh} label="novos" />
        <Stat icon={<Trophy className="h-4 w-4" />} tone="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300" value={totals.mastered} label={`dominados de ${totals.total}`} />
        <Stat icon={streak > 1 ? <Flame className="h-4 w-4" /> : <Target className="h-4 w-4" />} tone="bg-brand-soft text-brand dark:bg-brand/15"
          value={overview.reviewedToday} label={accuracyToday !== null ? `hoje · ${accuracyToday}% de acerto` : "revisados hoje"} />
      </dl>

      {/* Baralhos */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-[15px] font-bold text-foreground">Baralhos por disciplina</h3>
          <Link href={studyHref(courseId, undefined, "tudo")} className="inline-flex items-center gap-1 text-[13px] font-semibold text-foreground-muted hover:text-foreground">
            <Shuffle className="h-3.5 w-3.5" /> Treino livre com tudo
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {decks.map((d) => <DeckCard key={d.id} d={d} courseId={courseId} />)}
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, tone, value, label }: { icon: React.ReactNode; tone: string; value: number; label: string }) {
  return (
    <div className="rounded-[14px] border border-border bg-card p-3.5">
      <span className={cn("grid h-8 w-8 place-items-center rounded-lg", tone)}>{icon}</span>
      <dd className="mt-2 text-[22px] font-black leading-none text-foreground">{value}</dd>
      <dt className="mt-1 text-[12px] font-semibold text-foreground-muted">{label}</dt>
    </div>
  );
}

function DeckCard({ d, courseId }: { d: DeckSummary; courseId: string }) {
  const R = 22;
  const C = 2 * Math.PI * R;
  const pending = d.due + d.fresh;
  return (
    <div className="group relative flex flex-col rounded-[16px] border border-border bg-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(31,43,58,.10)]">
      <div className="flex items-start gap-3">
        {/* Anel de domínio */}
        <div className="relative h-14 w-14 shrink-0">
          <svg viewBox="0 0 50 50" className="h-full w-full -rotate-90">
            <circle cx="25" cy="25" r={R} className="fill-none stroke-line dark:stroke-white/10" strokeWidth="5" />
            <circle cx="25" cy="25" r={R} className={cn("fill-none", d.mastery >= 80 ? "stroke-ok" : "stroke-violet-500")} strokeWidth="5" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={C * (1 - d.mastery / 100)} />
          </svg>
          <span className="absolute inset-0 grid place-items-center text-[12px] font-extrabold text-foreground">{d.mastery}%</span>
        </div>
        <div className="min-w-0 flex-1">
          <Link href={studyHref(courseId, d.id)} className="block truncate text-[15px] font-bold text-foreground after:absolute after:inset-0 after:content-['']">{d.title}</Link>
          <p className="text-xs text-foreground-muted">{d.total} cart{d.total !== 1 ? "ões" : "ão"} · {d.mastered} dominado{d.mastered !== 1 ? "s" : ""}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {d.due > 0 && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">{d.due} para revisar</span>}
            {d.fresh > 0 && <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-bold text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">{d.fresh} novos</span>}
            {pending === 0 && d.total > 0 && <span className="rounded-full bg-ok-soft px-2 py-0.5 text-[11px] font-bold text-ok-text dark:bg-ok/15 dark:text-ok">Em dia</span>}
          </div>
        </div>
      </div>
      {/* Barra empilhada: dominados · aprendendo · novos */}
      {d.total > 0 && (
        <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-line dark:bg-white/10">
          <div className="bg-ok" style={{ width: `${(d.mastered / d.total) * 100}%` }} />
          <div className="bg-violet-400" style={{ width: `${(d.learning / d.total) * 100}%` }} />
        </div>
      )}
      <div className="relative z-10 mt-3 flex gap-2">
        <Link href={studyHref(courseId, d.id, pending > 0 ? undefined : "tudo")}
          className={cn("inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg text-[13px] font-bold transition",
            pending > 0 ? "bg-violet-600 text-white hover:bg-violet-700" : "border border-line-strong text-foreground hover:bg-background dark:border-white/10")}>
          <Play className="h-3.5 w-3.5 fill-current" /> {pending > 0 ? "Estudar" : "Rever"}
        </Link>
        {d.mistakes > 0 && (
          <Link href={studyHref(courseId, d.id, "erros")} title="Só os cartões que você errou"
            className="inline-flex h-9 items-center gap-1 rounded-lg border border-line-strong px-3 text-[13px] font-semibold text-foreground hover:bg-background dark:border-white/10">
            <RotateCcw className="h-3.5 w-3.5" /> Erros {d.mistakes}
          </Link>
        )}
        <Link href={studyHref(courseId, d.id, "tudo")} title="Treino livre: o baralho todo, embaralhado" aria-label="Treino livre"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line-strong text-foreground-muted hover:bg-background hover:text-foreground dark:border-white/10">
          <Shuffle className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
