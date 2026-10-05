export const dynamic = "force-dynamic";
import Link from "next/link";
import { ChevronRight, CheckCircle2, Circle } from "lucide-react";
import { requireArea } from "@/lib/auth-guards";
import { db } from "@/lib/db";
import { getUserXp, patenteForLevel } from "@/lib/gamification";
import { getStudyStats, loadCourseOutline, resolveStudentCourse } from "@/lib/student-area";
import { Bar, ModuleCover, Panel, hours } from "@/components/student/kit";
import { cn } from "@/lib/utils/cn";

const WEEKDAY = ["S", "T", "Q", "Q", "S", "S", "D"];

// Progresso (modelo 7d): aulas concluídas, constância e andamento por disciplina.
export default async function StudentProgressPage(props: { searchParams: Promise<{ courseId?: string }> }) {
  const { courseId } = await props.searchParams;
  const session = await requireArea("student");
  const userId = session.user.id;
  const { current } = await resolveStudentCourse(userId, courseId);
  const stats = await getStudyStats(userId);
  const xp = await getUserXp(userId);
  const patente = patenteForLevel(xp.level);
  const outline = current ? await loadCourseOutline(userId, current.courseId) : null;
  const totalLessons = outline?.modules.reduce((s, m) => s + m.total, 0) ?? 0;
  const doneLessons = outline?.modules.reduce((s, m) => s + m.done, 0) ?? 0;

  // Missões (as mesmas do Início antigo, derivadas de dados reais).
  const user = await db.user.findUnique({ where: { id: userId }, select: { avatar: true, bio: true, phone: true, lastViewedProductId: true } });
  const favorites = await db.favorite.count({ where: { userId } });
  const watchedAny = await db.lessonProgress.count({ where: { userId } });
  const missions = [
    { label: "Assista sua primeira aula", done: watchedAny > 0 },
    { label: "Complete seu perfil", done: Boolean(user?.avatar && (user?.bio || user?.phone)) },
    { label: "Explore o catálogo", done: favorites > 0 || Boolean(user?.lastViewedProductId) },
  ];

  const disciplines = outline?.disciplines.filter((d) => d.total > 0) ?? [];
  const started = disciplines.filter((d) => d.done > 0).sort((a, b) => b.percent - a.percent);
  const notStarted = disciplines.filter((d) => d.done === 0);
  // Onde focar: em andamento com menos progresso, depois as não iniciadas com mais aulas.
  const focus = [
    ...started.filter((d) => d.percent < 100).sort((a, b) => a.percent - b.percent),
    ...[...notStarted].sort((a, b) => b.total - a.total),
  ].slice(0, 3);
  const weekMax = Math.max(1, ...stats.week.map((d) => d.seconds));
  const base = outline ? `/student/course?courseId=${outline.courseId}` : "/student/course";

  return (
    <div className="space-y-4">
      <h1 className="text-[22px] font-extrabold text-foreground lg:text-[26px]">Progresso</h1>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <div className="rounded-[14px] bg-navy p-4 text-white lg:p-[18px]">
          <p className="text-[11px] font-bold uppercase tracking-wider text-white/60">Aulas concluídas</p>
          <p className="mt-1 text-[30px] font-extrabold leading-none">{doneLessons} <span className="text-sm font-semibold text-white/60">de {totalLessons}</span></p>
          <p className="mt-2 truncate text-xs text-white/60">{outline?.title ?? "Nenhum curso ainda"}</p>
        </div>
        <Stat label="Curso concluído" value={`${outline?.progress ?? 0}%`} hint={outline ? <Bar value={outline.progress} className="mt-1" /> : "sem curso"} />
        <Stat label="Horas estudadas" value={hours(stats.totalSeconds)}
          hint={<span className={stats.weekSeconds > 0 ? "text-ok-text dark:text-ok" : ""}>{stats.weekSeconds > 0 ? `▲ ${hours(stats.weekSeconds)} esta semana` : "nada esta semana ainda"}</span>} />
        <Stat label="Sequência" value={<>{stats.streak} <span className="text-sm font-semibold text-foreground-muted">dias</span></>} hint={`recorde: ${stats.record} dia${stats.record !== 1 ? "s" : ""}`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Panel title="Por disciplina" action={<span className="text-xs text-foreground-muted">aulas concluídas</span>}>
          {disciplines.length === 0 ? (
            <p className="px-[18px] pb-6 pt-2 text-sm text-foreground-muted">Nenhuma aula publicada ainda.</p>
          ) : (
            <ul className="space-y-3 px-[18px] pb-4 pt-3">
              {started.map((d) => (
                <li key={d.key}>
                  <Link href={`${base}&disciplina=${encodeURIComponent(d.key)}`} className="flex items-center gap-3">
                    <ModuleCover cover={d.modules[0].coverImage} title={d.name} number={d.modules[0].number} size="sm" className="h-9 w-9 shrink-0 rounded-lg" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-foreground">{d.name}</span>
                        <span className={cn("shrink-0 text-xs font-bold", d.percent === 100 ? "text-ok-text dark:text-ok" : "text-foreground")}>{d.percent}%</span>
                      </span>
                      <Bar value={d.percent} tone={d.percent === 100 ? "ok" : "brand"} className="mt-1.5" />
                    </span>
                  </Link>
                </li>
              ))}
              {notStarted.length > 0 && (
                <li className="flex items-center gap-3 text-sm text-foreground-muted">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-background text-xs font-bold">+{notStarted.length}</span>
                  {notStarted.length} não iniciada{notStarted.length !== 1 ? "s" : ""} · 0%
                </li>
              )}
            </ul>
          )}
        </Panel>

        <div className="space-y-4">
          <Panel title="Onde focar" action={<span className="text-xs text-foreground-muted">pelo seu andamento</span>}>
            {focus.length === 0 ? (
              <p className="px-[18px] pb-5 pt-2 text-sm text-foreground-muted">Tudo em dia. 👏</p>
            ) : (
              <ol className="px-[18px] pb-2 pt-1">
                {focus.map((d, i) => (
                  <li key={d.key} className="border-b border-line-soft last:border-0 dark:border-white/10">
                    <Link href={`${base}&disciplina=${encodeURIComponent(d.key)}`} className="flex items-center gap-3 py-3">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-bold text-brand dark:bg-brand/15">{i + 1}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-foreground">{d.name}</span>
                        <span className="block text-xs text-foreground-muted">{d.done === 0 ? `não iniciada · ${d.total} aulas` : `${d.percent}% concluído · faltam ${d.total - d.done} aulas`}</span>
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-foreground-muted" />
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </Panel>

          <Panel title="Esta semana" action={<Link href="/student/profile?secao=preferencias" className="text-xs font-semibold text-brand">meta: {hours(stats.goalMinutes * 60)}</Link>}>
            <div className="flex h-[110px] items-end gap-2 px-[18px] pb-2 pt-4">
              {stats.week.map((d, i) => (
                <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={hours(d.seconds)}>
                  <div className={cn("w-full rounded-t-md", d.seconds ? "bg-brand" : "bg-line dark:bg-white/10")} style={{ height: `${Math.max(4, (d.seconds / weekMax) * 100)}%` }} />
                  <span className={cn("text-[10px]", d.isToday ? "font-bold text-foreground" : "text-foreground-muted")}>{WEEKDAY[i]}</span>
                </div>
              ))}
            </div>
            <p className="px-[18px] pb-4 text-xs text-foreground-muted">{hours(stats.weekSeconds)} de {hours(stats.goalMinutes * 60)} · média de {hours(stats.avgPerDaySeconds)} por dia</p>
          </Panel>

          <Panel title="Nível" action={<span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-[11px] font-bold text-brand-dark dark:bg-brand/15 dark:text-brand">{patente.current}</span>}>
            <div className="px-[18px] pb-4 pt-2">
              <p className="text-[26px] font-extrabold leading-none text-foreground">{xp.level} <span className="text-xs font-semibold text-foreground-muted">· {xp.currentLevelXp} / {xp.nextLevelXp} XP</span></p>
              <Bar value={(xp.currentLevelXp / xp.nextLevelXp) * 100} className="mt-2.5" />
              {patente.next && <p className="mt-2 text-xs text-foreground-muted">Próxima patente: <b className="text-foreground">{patente.next}</b></p>}
              <ul className="mt-3 space-y-2 border-t border-line-soft pt-3 dark:border-white/10">
                {missions.map((m) => (
                  <li key={m.label} className="flex items-center gap-2 text-[13px]">
                    {m.done ? <CheckCircle2 className="h-4 w-4 shrink-0 text-ok" /> : <Circle className="h-4 w-4 shrink-0 text-line-strong" />}
                    <span className={m.done ? "text-foreground-muted line-through" : "text-foreground"}>{m.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <div className="rounded-[14px] border border-border bg-card p-4 lg:p-[18px]">
      <p className="text-[11px] font-bold uppercase tracking-wider text-foreground-muted">{label}</p>
      <p className="mt-1 text-[26px] font-extrabold leading-none text-foreground">{value}</p>
      {hint && <div className="mt-2 text-xs text-foreground-muted">{hint}</div>}
    </div>
  );
}
