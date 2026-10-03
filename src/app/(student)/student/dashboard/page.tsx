export const dynamic = "force-dynamic";
import Link from "next/link";
import { Play, FileText, ChevronRight } from "lucide-react";
import { requireArea } from "@/lib/auth-guards";
import { db } from "@/lib/db";
import { getStudyStats, lastWatchedLesson, loadCourseOutline, pickNextUp, resolveStudentCourse } from "@/lib/student-area";
import { Bar, ModuleCover, Panel, clock, hours, playerHref } from "@/components/student/kit";
import { CdnImg } from "@/components/ui/cdn-img";
import { InstallBanner } from "@/components/pwa/install-banner";
import { formatCurrency } from "@/lib/utils/cn";

function greeting() {
  const hour = Number(new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hour12: false, timeZone: "America/Fortaleza" }).format(new Date()));
  return hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
}

// Início (modelos 7a e 8a): "continuar de onde parei" em destaque, meta da semana, próximas aulas e módulos.
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
  const goal = stats.goalMinutes * 60;
  const missing = Math.max(0, goal - stats.weekSeconds);
  const lessonPct = current?.duration ? Math.round((current.position / current.duration) * 100) : 0;
  const remaining = current?.duration ? Math.max(0, current.duration - current.position) : 0;

  // Módulos: em andamento primeiro, depois na ordem do curso.
  const modules = [...outline.modules]
    .filter((m) => m.total > 0)
    .sort((a, b) => Number(b.done > 0 && b.done < b.total) - Number(a.done > 0 && a.done < a.total) || a.number - b.number);

  return (
    <div className="space-y-5">
      <InstallBanner />
      <div>
        <h1 className="text-[22px] font-extrabold text-foreground lg:text-[26px]">{greeting()}, {firstName}</h1>
        <p className="mt-0.5 text-sm text-foreground-muted">
          Você já concluiu {outline.progress}% do curso
          {courses.length > 1 && <> · <Link href="/student/library" className="font-semibold text-brand">trocar curso</Link></>}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Continuar assistindo */}
        {current ? (
          <Link href={playerHref(course.courseId, current.lessonId)} className="group flex flex-col overflow-hidden rounded-[14px] bg-navy text-white sm:flex-row">
            <ModuleCover cover={outline.modules[current.moduleNumber - 1]?.coverImage ?? null} instructorName={current.instructorName} number={current.moduleNumber}
              className="aspect-video w-full shrink-0 sm:aspect-auto sm:w-[38%]" />
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

        {/* Meta da semana */}
        <Panel className="h-full p-4 lg:p-[18px]">
          <div className="flex items-baseline justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-foreground-muted">Meta da semana</p>
            <span className="hidden text-[11px] text-foreground-muted lg:inline">seg – dom</span>
          </div>
          <p className="mt-1 text-[26px] font-extrabold leading-none text-foreground">{hours(stats.weekSeconds)} <span className="text-sm font-semibold text-foreground-muted">de {hours(goal)}</span></p>
          <Bar value={(stats.weekSeconds / goal) * 100} tone={missing === 0 ? "ok" : "brand"} className="mt-3" />
          <p className="mt-2 text-xs text-foreground-muted">
            {missing === 0 ? "Meta batida! 💪" : `Faltam ${hours(missing)} para bater sua meta.`} Média de {hours(stats.avgPerDaySeconds)} por dia.
          </p>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Seus módulos */}
        <div className="min-w-0 lg:order-1">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[17px] font-bold text-foreground">Seus módulos</h2>
            <Link href="/student/course" className="text-[13px] font-semibold text-brand">Ver todos{outline.modules.length > 5 ? ` os ${outline.modules.length}` : ""} →</Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
            {modules.slice(0, 5).map((m, i) => {
              const done = m.total > 0 && m.done === m.total;
              return (
                <Link key={m.id} href={`/student/course?modulo=${m.id}`} className={`min-w-0 overflow-hidden rounded-[12px] border border-border bg-card hover:shadow-md ${i >= 4 ? "hidden xl:block" : ""}`}>
                  <ModuleCover cover={m.coverImage} instructorName={m.instructorName} number={m.number} done={done} pdf={m.kind === "pdf"} className="aspect-video" />
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
        <Panel title="Próximas" className="lg:order-2">
          {upcoming.length === 0 ? (
            <p className="px-[18px] pb-5 pt-2 text-sm text-foreground-muted">Nada na fila por enquanto.</p>
          ) : (
            <ul className="divide-y divide-line-soft px-[18px] pb-2 pt-1 dark:divide-white/10">
              {upcoming.map((u) => (
                <li key={u.lessonId}>
                  <Link href={playerHref(u.courseId, u.lessonId)} className="flex items-center gap-3 py-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand dark:bg-brand/15">
                      {u.isPdf ? <FileText className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-semibold text-foreground">{u.lessonIndex}. {u.lessonTitle}</span>
                      <span className="block truncate text-[11.5px] text-foreground-muted">{u.isPdf ? "PDF" : u.duration ? clock(u.duration) : "Vídeo"} · {u.moduleTitle}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-foreground-muted" />
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
