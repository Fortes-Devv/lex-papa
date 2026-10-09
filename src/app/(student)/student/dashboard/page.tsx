export const dynamic = "force-dynamic";
import Link from "next/link";
import { Brain, Check, ChevronRight, Clock, FileText, Flame, Layers, Play, Shield } from "lucide-react";
import { requireArea } from "@/lib/auth-guards";
import { db } from "@/lib/db";
import { dayKey, getStudyStats, lastWatchedLesson, loadCourseOutline, pickNextUp, resolveStudentCourse } from "@/lib/student-area";
import { Bar, ModuleCover, Panel, clock, hours, playerHref } from "@/components/student/kit";
import { CdnImg } from "@/components/ui/cdn-img";
import { InstallBanner } from "@/components/pwa/install-banner";
import { cn, formatCurrency } from "@/lib/utils/cn";
import { getUserXp, patenteForLevel } from "@/lib/gamification";
import { flashcardsTodayProgress } from "@/lib/flashcards/queries";
import { COURSE_SECTIONS } from "@/components/course/course-sections";

function greeting() {
  const hour = Number(new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hour12: false, timeZone: "America/Fortaleza" }).format(new Date()));
  return hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
}

// Início: "continuar de onde parei" em destaque, meta da semana com os 7 dias, ferramentas de
// estudo (FlashCards ao vivo; Simulados, Cronogramas e Mentoria em breve), plano de hoje,
// módulos e próximas aulas.
export default async function StudentHomePage() {
  const session = await requireArea("student");
  const userId = session.user.id;
  const firstName = (session.user.name ?? "").split(" ")[0];
  const { courses, current: course } = await resolveStudentCourse(userId);
  const stats = await getStudyStats(userId);

  if (!course) {
    const featured = await db.product.findFirst({
      where: { type: "course", status: "published" },
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      select: { id: true, title: true, slug: true, shortDescription: true, thumbnail: true, price: true },
    });
    return (
      <div className="space-y-5">
        <h1 className="text-[26px] font-extrabold text-foreground">{greeting()}, {firstName}</h1>
        <Panel className="p-6 text-center">
          <p className="text-[15px] font-bold text-foreground">Você ainda não tem um curso</p>
          <p className="mt-1 text-sm text-foreground-muted">Escolha um curso para começar a estudar. Ele aparece aqui com a próxima aula.</p>
          <Link href="/student/explore" className="mt-4 inline-flex h-10 items-center rounded-lg bg-brand px-5 text-sm font-bold text-white hover:bg-brand-dark">Ver cursos</Link>
        </Panel>
        {featured && (
          <Link href={`/cursos/${featured.slug}`} className="flex items-center gap-4 rounded-[14px] border border-border bg-card p-3 hover:shadow-md">
            <CdnImg src={featured.thumbnail} width={160} alt="" className="h-20 w-32 shrink-0 rounded-lg object-cover" />
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-brand">Em destaque</span>
              <span className="block truncate text-[15px] font-bold text-foreground">{featured.title}</span>
              <span className="block truncate text-xs text-foreground-muted">{featured.shortDescription}</span>
            </span>
            <span className="shrink-0 text-sm font-bold text-foreground">{formatCurrency(Number(featured.price))}</span>
          </Link>
        )}
      </div>
    );
  }

  const outline = (await loadCourseOutline(userId, course.courseId))!;
  const { current, upcoming } = pickNextUp(outline, await lastWatchedLesson(userId, course.courseId));
  // Meia-noite de hoje em Fortaleza (UTC-3, sem horário de verão).
  const todayStart = new Date(dayKey().getTime() + 3 * 3600000);
  const [xp, fc, lessonsToday] = await Promise.all([
    getUserXp(userId),
    flashcardsTodayProgress(userId, course.courseId),
    db.lessonProgress.count({ where: { userId, courseId: course.courseId, isCompleted: true, completedAt: { gte: todayStart } } }),
  ]);
  const patente = patenteForLevel(xp.level);
  const goal = stats.goalMinutes * 60;
  const missing = Math.max(0, goal - stats.weekSeconds);
  const lessonPct = current?.duration ? Math.round((current.position / current.duration) * 100) : 0;
  const remaining = current?.duration ? Math.max(0, current.duration - current.position) : 0;
  const courseHref = `/student/course?courseId=${course.courseId}`;
  const weekMax = Math.max(...stats.week.map((d) => d.seconds), 1);
  const todaySeconds = stats.week.find((d) => d.isToday)?.seconds ?? 0;

  // Plano de hoje: missões simples que fecham o dia de estudo.
  const missions = [
    {
      key: "aula", label: "Concluir uma aula",
      detail: lessonsToday ? `${lessonsToday} concluída${lessonsToday !== 1 ? "s" : ""} hoje` : current ? current.lessonTitle : "Todas assistidas",
      done: lessonsToday > 0, href: current ? playerHref(course.courseId, current.lessonId) : `${courseHref}&secao=aulas`, icon: <Play className="h-4 w-4 fill-current" />,
    },
    ...(fc.total ? [{
      key: "flash", label: fc.remaining ? `Revisar ${fc.remaining} flashcard${fc.remaining !== 1 ? "s" : ""}` : "Revisar os flashcards",
      detail: fc.remaining ? (fc.reviewedToday ? `${fc.reviewedToday} revisados hoje · faltam ${fc.remaining}` : "Revisão espaçada do dia") : `${fc.reviewedToday} revisados hoje · em dia`,
      done: fc.remaining === 0, href: `/student/flashcards?courseId=${course.courseId}`, icon: <Layers className="h-4 w-4" />,
    }] : []),
    {
      key: "meta", label: "Estudar 1h hoje", detail: `${hours(todaySeconds)} estudados hoje`,
      done: todaySeconds >= 3600, href: current ? playerHref(course.courseId, current.lessonId) : courseHref, icon: <Clock className="h-4 w-4" />,
    },
  ];
  const missionsDone = missions.filter((m) => m.done).length;

  // Módulos: em andamento primeiro, depois na ordem do curso.
  const modules = [...outline.modules]
    .filter((m) => m.total > 0)
    .sort((a, b) => Number(b.done > 0 && b.done < b.total) - Number(a.done > 0 && a.done < a.total) || a.number - b.number);
  const otherTools = COURSE_SECTIONS.filter((x) => x.id !== "aulas" && x.id !== "flashcards");

  return (
    <div className="space-y-5">
      <InstallBanner />

      {/* Saudação + sequência e patente */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-extrabold text-foreground lg:text-[26px]">{greeting()}, {firstName}</h1>
          <p className="mt-0.5 text-sm text-foreground-muted">
            Você já concluiu {outline.progress}% do curso
            {courses.length > 1 && <> · <Link href="/student/library" className="font-semibold text-brand">trocar curso</Link></>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/student/progress" className={cn("inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[13px] font-bold transition hover:-translate-y-0.5",
            stats.streak > 0 ? "border-brand-border bg-brand-soft text-brand dark:border-brand/30 dark:bg-brand/10" : "border-border bg-card text-foreground-muted")}>
            <Flame className="h-4 w-4" /> {stats.streak > 0 ? `${stats.streak} dia${stats.streak !== 1 ? "s" : ""} seguido${stats.streak !== 1 ? "s" : ""}` : "Comece sua sequência"}
          </Link>
          <Link href="/student/progress" className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-[13px] font-bold text-foreground transition hover:-translate-y-0.5">
            <Shield className="h-4 w-4 text-brand" /> {patente.current}
            <span className="hidden h-1.5 w-14 overflow-hidden rounded-full bg-line sm:block dark:bg-white/10">
              <span className="block h-full rounded-full bg-brand" style={{ width: `${Math.round((xp.currentLevelXp / xp.nextLevelXp) * 100)}%` }} />
            </span>
            <span className="text-xs font-semibold text-foreground-muted">nv. {xp.level}</span>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Continuar assistindo */}
        {current ? (
          <Link href={playerHref(course.courseId, current.lessonId)} className="group flex flex-col overflow-hidden rounded-[16px] bg-navy text-white shadow-[0_10px_30px_rgba(31,43,58,.18)] transition hover:-translate-y-0.5 sm:flex-row">
            <div className="relative aspect-video w-full shrink-0 overflow-hidden sm:aspect-auto sm:w-[38%]">
              <ModuleCover cover={outline.modules[current.moduleNumber - 1]?.coverImage ?? null} title={current.moduleTitle} number={current.moduleNumber}
                className="h-full w-full transition-transform duration-500 group-hover:scale-105" />
              <span className="absolute inset-0 grid place-items-center bg-black/0 transition group-hover:bg-black/25">
                <span className="grid h-14 w-14 scale-75 place-items-center rounded-full bg-brand opacity-0 shadow-xl transition group-hover:scale-100 group-hover:opacity-100"><Play className="h-6 w-6 fill-current" /></span>
              </span>
            </div>
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 p-5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-brand">{current.position > 0 ? "Continuar assistindo" : "Próxima aula"}</p>
              <p className="text-[19px] font-extrabold leading-snug">{current.lessonIndex}. {current.lessonTitle}</p>
              <p className="text-[13px] text-white/60">
                {current.moduleTitle}{current.instructorName ? ` · Prof. ${current.instructorName.split(" ")[0]}` : ""}
                {remaining > 0 && current.position > 0 ? ` · faltam ${hours(remaining)}` : ""}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-3">
                <span className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-bold group-hover:bg-brand-dark">
                  {current.isPdf ? <FileText className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
                  {current.isPdf ? "Abrir material" : current.position > 0 ? `Continuar · ${clock(current.position)}` : "Começar aula"}
                </span>
                {current.position > 0 && current.duration ? (
                  <span className="text-xs text-white/60">{lessonPct}% da aula · aula {current.lessonIndex} de {current.moduleLessons} do módulo</span>
                ) : null}
              </div>
              {current.position > 0 && current.duration ? <Bar value={lessonPct} tone="light" className="mt-1" /> : null}
            </div>
          </Link>
        ) : (
          <Panel className="flex flex-col items-center justify-center p-8 text-center">
            <p className="text-[15px] font-bold text-foreground">{outline.modules.length ? "Curso concluído! 🎉" : "As aulas ainda não foram publicadas"}</p>
            <p className="mt-1 text-sm text-foreground-muted">{outline.modules.length ? "Você assistiu todas as aulas. Revise quando quiser em Meu curso." : "Assim que o professor publicar, elas aparecem aqui."}</p>
          </Panel>
        )}

        {/* Meta da semana com os 7 dias */}
        <Panel className="h-full p-4 lg:p-[18px]">
          <div className="flex items-baseline justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-foreground-muted">Meta da semana</p>
            <Link href="/student/profile" className="text-[11px] font-semibold text-foreground-muted hover:text-foreground">ajustar</Link>
          </div>
          <p className="mt-1 text-[26px] font-extrabold leading-none text-foreground">{hours(stats.weekSeconds)} <span className="text-sm font-semibold text-foreground-muted">de {hours(goal)}</span></p>
          <Bar value={(stats.weekSeconds / goal) * 100} tone={missing === 0 ? "ok" : "brand"} className="mt-3" />
          <div className="mt-4 flex h-16 items-end gap-1.5">
            {stats.week.map((d, i) => (
              <div key={i} className="flex h-full flex-1 flex-col items-center gap-1" title={hours(d.seconds)}>
                <div className="flex w-full flex-1 items-end">
                  <div className={cn("w-full rounded-md transition-all", d.isToday ? "bg-brand" : d.seconds ? "bg-navy/70 dark:bg-white/40" : "bg-line dark:bg-white/10", d.future && "opacity-40")}
                    style={{ height: `${d.seconds ? Math.max(14, (d.seconds / weekMax) * 100) : 10}%` }} />
                </div>
                <span className={cn("text-[10px] font-bold", d.isToday ? "text-brand" : "text-foreground-muted")}>{"STQQSSD"[i]}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-foreground-muted">
            {missing === 0 ? "Meta batida! 💪" : `Faltam ${hours(missing)}.`} Média de {hours(stats.avgPerDaySeconds)} por dia.
          </p>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Ferramentas de estudo */}
        <div className="min-w-0">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[17px] font-bold text-foreground">Ferramentas de estudo</h2>
            <Link href={courseHref} className="text-[13px] font-semibold text-brand">Ver o curso →</Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {/* FlashCards em destaque */}
            <Link href={fc.total ? `/student/flashcards?courseId=${course.courseId}${fc.remaining ? "" : "&modo=tudo"}` : `${courseHref}&secao=flashcards`}
              className="group relative col-span-2 flex min-h-[160px] flex-col overflow-hidden rounded-[16px] bg-gradient-to-br from-violet-700 via-violet-600 to-fuchsia-600 p-4 text-white shadow-[0_10px_28px_rgba(124,58,237,.28)] transition hover:-translate-y-0.5">
              <span aria-hidden className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-white/10 blur-lg transition-transform duration-500 group-hover:scale-125" />
              <span aria-hidden className="pointer-events-none absolute -bottom-5 right-4">
                <span className="absolute bottom-0 right-10 h-20 w-14 rotate-[-14deg] rounded-lg bg-white/10 ring-1 ring-white/20 transition-transform duration-300 group-hover:rotate-[-22deg]" />
                <span className="relative block h-20 w-14 rotate-[8deg] rounded-lg bg-white/90 shadow-lg transition-transform duration-300 group-hover:rotate-[16deg]">
                  <Brain className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 text-violet-600" />
                </span>
              </span>
              <span className="relative flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-white/80"><Layers className="h-4 w-4" /> FlashCards</span>
              <span className="relative mt-2 text-[24px] font-black leading-tight">
                {!fc.total ? "Em preparação" : fc.remaining ? `${fc.remaining} para hoje` : "Tudo revisado!"}
              </span>
              <span className="relative mt-0.5 max-w-[68%] text-[12.5px] leading-snug text-white/80">
                {!fc.total ? "Os baralhos deste curso estão sendo montados." : fc.remaining ? "Certo ou Errado, lei seca e perguntas na hora certa de revisar." : `${fc.reviewedToday} revisados hoje. Volte amanhã!`}
              </span>
              {fc.total > 0 && (
                <span className="relative mt-auto inline-flex w-fit items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[13px] font-extrabold text-violet-700 shadow">
                  <Play className="h-3.5 w-3.5 fill-current" /> {fc.remaining ? "Revisar agora" : "Treino livre"}
                </span>
              )}
            </Link>
            {otherTools.map((t) => {
              const Icon = t.icon;
              return (
                <Link key={t.id} href={`${courseHref}&secao=${t.id}`}
                  className={cn("group relative flex min-h-[160px] flex-col overflow-hidden rounded-[16px] border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(31,43,58,.10)]",
                    t.id === "mentoria" && "col-span-2 sm:col-span-1")}>
                  <span aria-hidden className={cn("absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-gradient-to-r transition-transform duration-300 group-hover:scale-x-100", t.bar)} />
                  <span className={cn("grid h-10 w-10 place-items-center rounded-xl transition-all duration-300 group-hover:scale-110 group-hover:text-white", t.accent)}><Icon className="h-5 w-5" /></span>
                  <span className="mt-3 text-[14.5px] font-bold text-foreground">{t.label}</span>
                  <span className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-foreground-muted">{t.hint}</span>
                  {!t.ready && <span className="mt-auto w-fit rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-bold text-foreground-muted">Em breve</span>}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Plano de hoje */}
        <Panel className="p-4 lg:mt-[38px] lg:p-[18px]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-foreground-muted">Plano de hoje</p>
              <p className="mt-0.5 text-[15px] font-bold text-foreground">{missionsDone === missions.length ? "Dia completo! 🏆" : `${missionsDone} de ${missions.length} missões`}</p>
            </div>
            <MissionRing done={missionsDone} total={missions.length} />
          </div>
          <ul className="mt-3 space-y-2">
            {missions.map((m) => (
              <li key={m.key}>
                <Link href={m.href} className={cn("group flex items-center gap-3 rounded-xl border p-2.5 transition",
                  m.done ? "border-ok/30 bg-ok-soft/60 dark:bg-ok/10" : "border-border hover:border-brand-border hover:bg-background")}>
                  <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full transition",
                    m.done ? "bg-ok text-white" : "bg-brand-soft text-brand group-hover:bg-brand group-hover:text-white dark:bg-brand/15")}>
                    {m.done ? <Check className="h-4 w-4" /> : m.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block truncate text-[13.5px] font-semibold", m.done ? "text-foreground-muted line-through decoration-ok/60" : "text-foreground")}>{m.label}</span>
                    <span className="block truncate text-[11.5px] text-foreground-muted">{m.detail}</span>
                  </span>
                  {!m.done && <ChevronRight className="h-4 w-4 shrink-0 text-foreground-muted transition group-hover:translate-x-0.5" />}
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Seus módulos */}
        <div className="min-w-0 lg:order-1">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[17px] font-bold text-foreground">Seus módulos</h2>
            <Link href="/student/course?secao=aulas" className="text-[13px] font-semibold text-brand">Ver todos{outline.modules.length > 5 ? ` os ${outline.modules.length}` : ""} →</Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
            {modules.slice(0, 5).map((m, i) => {
              const done = m.total > 0 && m.done === m.total;
              return (
                <Link key={m.id} href={`/student/course?modulo=${m.id}`}
                  className={cn("group min-w-0 overflow-hidden rounded-[12px] border border-border bg-card transition hover:-translate-y-0.5 hover:shadow-md", i >= 4 && "hidden xl:block")}>
                  <div className="overflow-hidden">
                    <ModuleCover cover={m.coverImage} title={m.title} number={m.number} done={done} pdf={m.kind === "pdf"} className="aspect-video transition-transform duration-500 group-hover:scale-105" />
                  </div>
                  <div className="p-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted">Módulo {String(m.number).padStart(2, "0")}</p>
                    <p className="truncate text-[13px] font-bold text-foreground">{m.title}</p>
                    <p className="text-[11px] text-foreground-muted">
                      {done ? "Concluído" : m.done === 0 ? (m.kind === "pdf" ? `${m.total} materia${m.total !== 1 ? "is" : "l"}` : "Não iniciado") : `${m.done} de ${m.total} aulas`}
                    </p>
                    {!done && m.done > 0 && <Bar value={(m.done / m.total) * 100} className="mt-1.5" />}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Próximas */}
        <Panel title="Próximas aulas" className="lg:order-2">
          {upcoming.length === 0 ? (
            <p className="px-[18px] pb-5 pt-2 text-sm text-foreground-muted">Nada na fila por enquanto.</p>
          ) : (
            <ul className="divide-y divide-line-soft px-[18px] pb-2 pt-1 dark:divide-white/10">
              {upcoming.map((u) => (
                <li key={u.lessonId}>
                  <Link href={playerHref(u.courseId, u.lessonId)} className="group flex items-center gap-3 py-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand transition group-hover:bg-brand group-hover:text-white dark:bg-brand/15">
                      {u.isPdf ? <FileText className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-semibold text-foreground">{u.lessonIndex}. {u.lessonTitle}</span>
                      <span className="block truncate text-[11.5px] text-foreground-muted">{u.isPdf ? "PDF" : u.duration ? clock(u.duration) : "Vídeo"} · {u.moduleTitle}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-foreground-muted transition group-hover:translate-x-0.5" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

function MissionRing({ done, total }: { done: number; total: number }) {
  const R = 18;
  const C = 2 * Math.PI * R;
  const full = done === total;
  return (
    <div className="relative h-12 w-12 shrink-0">
      <svg viewBox="0 0 44 44" className="h-full w-full -rotate-90">
        <circle cx="22" cy="22" r={R} className="fill-none stroke-line dark:stroke-white/10" strokeWidth="4.5" />
        <circle cx="22" cy="22" r={R} className={cn("fill-none transition-all duration-700", full ? "stroke-ok" : "stroke-brand")} strokeWidth="4.5" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C * (1 - done / Math.max(1, total))} />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-[12px] font-extrabold text-foreground">{done}/{total}</span>
    </div>
  );
}
