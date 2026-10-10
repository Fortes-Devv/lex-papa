export const dynamic = "force-dynamic";
import Link from "next/link";
import { Check, ChevronLeft, ChevronRight, FileText, Lock, Play, Search, HelpCircle, Users } from "lucide-react";
import { requireArea } from "@/lib/auth-guards";
import { lastWatchedLesson, loadCourseOutline, pickNextUp, resolveStudentCourse, type Discipline, type OutlineModule } from "@/lib/student-area";
import { Bar, Chip, ModuleCover, Panel, clock, hours, playerHref } from "@/components/student/kit";
import { CdnImg } from "@/components/ui/cdn-img";
import { cn } from "@/lib/utils/cn";
import { db } from "@/lib/db";
import { countFlashcardsToday, loadFlashcardsOverview } from "@/lib/flashcards/queries";
import { FlashcardsHub } from "@/components/flashcards/flashcards-hub";
import { BackToSections, CourseHubHeader, CourseSectionList, CourseSectionSoon, parseCourseSection } from "@/components/course/course-sections";
import { isEnrollmentActive } from "@/lib/access";
import { MENTORIA_RELEASE_DAYS, lockedUntil, releaseLabel } from "@/lib/release";

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
type Filter = "todas" | "andamento" | "concluidas";

function statusLine(d: Discipline) {
  const pdfs = d.modules.filter((m) => m.kind === "pdf").reduce((s, m) => s + m.total, 0);
  const aulas = d.total - pdfs;
  const parts = [aulas ? `${aulas} aula${aulas !== 1 ? "s" : ""}` : null, pdfs ? `${pdfs} PDF${pdfs !== 1 ? "s" : ""}` : null].filter(Boolean).join(" · ");
  if (d.total > 0 && d.done === d.total) return `Concluída · ${parts}`;
  if (d.done === 0) return `Não iniciado · ${parts}`;
  return `${d.percent}% · ${parts}`;
}

// Meu curso: abre na lista de seções (Aulas e Materiais, FlashCards…). Em "Aulas e
// Materiais" (modelos 7b e 8b), módulos agrupados por disciplina, aulas e PDFs juntos.
export default async function StudentCoursePage(props: { searchParams: Promise<{ courseId?: string; secao?: string; disciplina?: string; modulo?: string; q?: string; filtro?: string }> }) {
  const sp = await props.searchParams;
  const session = await requireArea("student");
  const userId = session.user.id;
  const { courses, current } = await resolveStudentCourse(userId, sp.courseId);

  if (!current) {
    return (
      <Panel className="p-8 text-center">
        <p className="text-[15px] font-bold text-foreground">Você ainda não tem um curso</p>
        <Link href="/student/explore" className="mt-4 inline-flex h-10 items-center rounded-lg bg-brand px-5 text-sm font-bold text-white">Ver cursos</Link>
      </Panel>
    );
  }

  const outline = (await loadCourseOutline(userId, current.courseId))!;
  const { current: next } = pickNextUp(outline, await lastWatchedLesson(userId, current.courseId));
  const home = `/student/course?courseId=${outline.courseId}`;
  const base = `${home}&secao=aulas`;
  // Link direto para disciplina, módulo, busca ou filtro cai em "Aulas e Materiais".
  const section = parseCourseSection(sp.secao) ?? (sp.disciplina || sp.modulo || sp.q || sp.filtro ? "aulas" : null);
  const filter: Filter = sp.filtro === "andamento" || sp.filtro === "concluidas" ? sp.filtro : "todas";

  // Disciplina aberta: pedida na URL, a do módulo pedido ou a da próxima aula.
  const byModule = sp.modulo ? outline.disciplines.find((d) => d.modules.some((m) => m.id === sp.modulo)) : undefined;
  const nextDiscipline = next ? outline.disciplines.find((d) => d.modules.some((m) => m.lessons.some((l) => l.id === next.lessonId))) : undefined;
  const selected = outline.disciplines.find((d) => d.key === sp.disciplina) ?? byModule ?? nextDiscipline ?? outline.disciplines[0];
  const explicit = Boolean(sp.disciplina || sp.modulo); // no celular, mostra a disciplina só quando o aluno tocou nela

  const visible = outline.disciplines.filter((d) =>
    filter === "todas" ? true : filter === "concluidas" ? d.total > 0 && d.done === d.total : d.done > 0 && d.done < d.total);
  const counts = {
    todas: outline.disciplines.length,
    andamento: outline.disciplines.filter((d) => d.done > 0 && d.done < d.total).length,
    concluidas: outline.disciplines.filter((d) => d.total > 0 && d.done === d.total).length,
  };

  const q = sp.q?.trim();
  const results = q
    ? outline.modules.flatMap((m) => m.lessons.filter((l) => norm(l.title).includes(norm(q)) || norm(m.title).includes(norm(q))).map((l) => ({ m, l })))
    : null;

  const header = (
    <div className="flex items-center gap-3">
      <CdnImg src={outline.thumbnail} width={96} alt="" className="h-12 w-12 shrink-0 rounded-xl bg-navy object-cover" />
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[19px] font-extrabold text-foreground lg:text-[22px]">{outline.title}</h1>
        <p className="text-[13px] text-foreground-muted">{outline.modules.length} módulos · {outline.progress}% concluído</p>
      </div>
    </div>
  );

  const courseChips = courses.length > 1 && (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:px-0">
      {courses.map((c) => <Chip key={c.courseId} href={`/student/course?courseId=${c.courseId}`} active={c.courseId === outline.courseId}>{c.title}</Chip>)}
    </div>
  );

  if (!section) {
    const all = outline.modules.flatMap((m) => m.lessons);
    const pdfCount = all.filter((l) => l.isPdf).length;
    const seconds = all.reduce((s, l) => s + (l.duration ?? 0), 0);
    const nDisc = outline.disciplines.length;
    const fc = await countFlashcardsToday(userId, outline.courseId);
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        {courseChips}
        <CourseHubHeader
          thumbnail={outline.thumbnail}
          eyebrow="Seu curso"
          title={outline.title}
          stats={[
            { value: String(nDisc), label: `disciplina${nDisc !== 1 ? "s" : ""}` },
            { value: String(all.length - pdfCount), label: `aula${all.length - pdfCount !== 1 ? "s" : ""}` },
            ...(pdfCount ? [{ value: String(pdfCount), label: `PDF${pdfCount !== 1 ? "s" : ""}` }] : []),
            ...(seconds ? [{ value: hours(seconds), label: "de conteúdo" }] : []),
          ]}
        />
        <CourseSectionList
          href={(id) => `${home}&secao=${id}`}
          details={fc.total ? { flashcards: fc.today ? `${fc.today} para hoje` : "Em dia ✓" } : undefined}
          aulas={{
            detail: `${nDisc} disciplina${nDisc !== 1 ? "s" : ""} · ${outline.modules.length} módulo${outline.modules.length !== 1 ? "s" : ""}`,
            progress: outline.progress,
            resume: next ? {
              href: playerHref(outline.courseId, next.lessonId),
              label: next.position > 0 || outline.progress > 0 ? "Continuar de onde parou" : "Começar agora",
              sub: `${next.moduleTitle} · ${next.lessonTitle}`,
            } : undefined,
          }}
        />
      </div>
    );
  }
  if (section === "flashcards") {
    const [overview, xp] = await Promise.all([
      loadFlashcardsOverview(userId, outline.courseId),
      db.userXP.findUnique({ where: { userId }, select: { streak: true } }),
    ]);
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <BackToSections href={home} />
        <FlashcardsHub courseId={outline.courseId} overview={overview} streak={xp?.streak ?? 0} />
      </div>
    );
  }
  if (section === "mentoria") {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        {courseChips}
        <BackToSections href={home} />
        <MentoriaView userId={userId} courseId={outline.courseId} productId={outline.productId} />
      </div>
    );
  }
  if (section !== "aulas") {
    return <div className="mx-auto max-w-3xl"><CourseSectionSoon id={section} backHref={home} /></div>;
  }

  return (
    <div className="space-y-4">
      {courseChips}
      {/* No celular, com disciplina aberta, o "voltar" é para a lista de disciplinas. */}
      <BackToSections href={home} className={cn(explicit && !results && "hidden lg:inline-flex")} />

      {results ? (
        <>
          {header}
          <Panel title={<span className="flex items-center gap-2"><Search className="h-4 w-4" /> {results.length} resultado{results.length !== 1 ? "s" : ""} para “{q}”</span>}
            action={<Link href={base} className="text-[13px] font-semibold text-brand">Limpar busca</Link>}>
            <ul className="divide-y divide-line-soft px-[18px] pb-2 pt-1 dark:divide-white/10">
              {results.map(({ m, l }) => (
                <li key={l.id}>
                  <Link href={playerHref(outline.courseId, l.id)} className="flex items-center gap-3 py-3">
                    {l.isPdf ? <FileText className="h-4 w-4 shrink-0 text-brand" /> : <Play className="h-4 w-4 shrink-0 text-brand" />}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-foreground">{l.title}</span>
                      <span className="block truncate text-xs text-foreground-muted">{m.title}{l.duration ? ` · ${clock(l.duration)}` : ""}</span>
                    </span>
                    {l.isCompleted && <Check className="h-4 w-4 shrink-0 text-ok" />}
                  </Link>
                </li>
              ))}
              {results.length === 0 && <li className="py-8 text-center text-sm text-foreground-muted">Nenhuma aula com esse nome.</li>}
            </ul>
          </Panel>
        </>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          {/* Lista de disciplinas (no celular some quando uma disciplina está aberta) */}
          <div className={cn("space-y-3", explicit && "hidden lg:block")}>
            {header}
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 lg:hidden">
              <Chip href={`${base}&filtro=todas`} active={filter === "todas"}>Todas · {counts.todas}</Chip>
              <Chip href={`${base}&filtro=andamento`} active={filter === "andamento"}>Em andamento · {counts.andamento}</Chip>
              <Chip href={`${base}&filtro=concluidas`} active={filter === "concluidas"}>Concluídas · {counts.concluidas}</Chip>
            </div>
            <Panel className="overflow-hidden">
              <p className="hidden px-[18px] pb-1 pt-4 text-[11px] font-bold uppercase tracking-wider text-foreground-muted lg:block">Disciplinas</p>
              <ul className="divide-y divide-line-soft lg:divide-y-0 dark:divide-white/10">
                {visible.map((d) => {
                  const active = d.key === selected?.key;
                  const first = d.modules[0];
                  return (
                    <li key={d.key}>
                      <Link href={`${base}&disciplina=${encodeURIComponent(d.key)}`} scroll={false}
                        className={cn("flex items-center gap-3 px-[18px] py-3 lg:py-2.5", active ? "lg:bg-brand-soft lg:dark:bg-brand/10" : "hover:bg-background")}>
                        <ModuleCover cover={first.coverImage} title={d.name} number={first.number} size="sm" done={d.total > 0 && d.done === d.total}
                          className="h-11 w-11 shrink-0 rounded-lg lg:hidden" />
                        <span className="min-w-0 flex-1">
                          <span className={cn("block truncate text-sm text-foreground", active ? "font-bold" : "font-semibold")}>{d.name}</span>
                          <span className="block truncate text-xs text-foreground-muted lg:hidden">{statusLine(d)}</span>
                        </span>
                        <span className={cn("hidden shrink-0 text-xs font-bold lg:block", d.percent === 100 ? "text-ok-text dark:text-ok" : "text-foreground-muted")}>{d.percent}%</span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-foreground-muted lg:hidden" />
                      </Link>
                    </li>
                  );
                })}
                {visible.length === 0 && <li className="px-[18px] py-8 text-center text-sm text-foreground-muted">Nenhuma disciplina neste filtro.</li>}
              </ul>
            </Panel>
          </div>

          {/* Disciplina aberta */}
          {selected ? (
            <div className={cn("min-w-0 space-y-4", !explicit && "hidden lg:block")}>
              <Link href={base} className="inline-flex items-center gap-1 text-sm font-semibold text-foreground-muted lg:hidden"><ChevronLeft className="h-4 w-4" /> Disciplinas</Link>
              <DisciplineView d={selected} courseId={outline.courseId} nextLessonId={next?.lessonId ?? null} />
            </div>
          ) : (
            <Panel className="p-8 text-center text-sm text-foreground-muted">As aulas deste curso ainda não foram publicadas.</Panel>
          )}
        </div>
      )}
    </div>
  );
}

function DisciplineView({ d, courseId, nextLessonId }: { d: Discipline; courseId: string; nextLessonId: string | null }) {
  const pdfs = d.modules.filter((m) => m.kind === "pdf").reduce((s, m) => s + m.total, 0);
  const lessons = d.modules.flatMap((m) => m.lessons);
  const resume = lessons.find((l) => l.id === nextLessonId) ?? lessons.find((l) => !l.isCompleted);
  const resumeIndex = resume ? d.modules.find((m) => m.lessons.includes(resume))!.lessons.indexOf(resume) + 1 : 0;
  const questionLesson = resume ?? lessons[0];

  return (
    <>
      <div className="rounded-[14px] bg-navy p-5 text-white">
        <p className="text-[11px] font-bold uppercase tracking-wider text-brand">Disciplina</p>
        <h2 className="mt-1 text-[22px] font-extrabold">{d.name}</h2>
        <p className="mt-1 text-[13px] text-white/60">
          {[d.instructorName ? `Prof. ${d.instructorName.split(" ")[0]}` : null, `${d.modules.length} módulo${d.modules.length !== 1 ? "s" : ""}`,
            `${d.total - pdfs} aula${d.total - pdfs !== 1 ? "s" : ""}`, pdfs ? `${pdfs} PDF${pdfs !== 1 ? "s" : ""}` : null, d.seconds ? hours(d.seconds) : null].filter(Boolean).join(" · ")}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {resume && (
            <Link href={playerHref(courseId, resume.id)} className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-bold hover:bg-brand-dark">
              <Play className="h-4 w-4 fill-current" /> {resume.position > 0 || d.done > 0 ? `Continuar aula ${resumeIndex}` : "Começar"}
            </Link>
          )}
          <span className="text-xs text-white/60">{d.percent}% concluído</span>
        </div>
        <Bar value={d.percent} tone="light" className="mt-3" />
      </div>

      {d.modules.map((m) => <ModuleBlock key={m.id} m={m} courseId={courseId} />)}

      {questionLesson && (
        <Panel className="flex items-center gap-3 p-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-soft text-brand dark:bg-brand/15"><HelpCircle className="h-5 w-5" /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-foreground">Dúvida nesta disciplina?</span>
            <span className="block text-xs text-foreground-muted">Pergunte na aula — o professor responde por lá.</span>
          </span>
          <Link href={`${playerHref(courseId, questionLesson.id)}&aba=duvidas`} className="inline-flex h-9 shrink-0 items-center rounded-lg border border-line-strong px-3.5 text-[13px] font-semibold text-foreground dark:border-white/10">Perguntar</Link>
        </Panel>
      )}
    </>
  );
}

function ModuleBlock({ m, courseId }: { m: OutlineModule; courseId: string }) {
  const pdf = m.kind === "pdf";
  return (
    <Panel className="overflow-hidden">
      <div className="flex items-center gap-3 border-b border-line-soft px-[18px] py-3 dark:border-white/10">
        <ModuleCover cover={m.coverImage} title={m.title} number={m.number} size="sm" className="h-10 w-10 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-bold text-foreground">{pdf ? "Material em PDF" : "Aulas em vídeo"} <span className="font-medium text-foreground-muted">· {m.title}</span></p>
          <p className="text-xs text-foreground-muted">
            {[m.instructorName ? `Prof. ${m.instructorName.split(" ")[0]}` : null, `${m.total} ${pdf ? `arquivo${m.total !== 1 ? "s" : ""}` : `aula${m.total !== 1 ? "s" : ""}`}`,
              !pdf ? hours(m.lessons.reduce((s, l) => s + (l.duration ?? 0), 0)) : null].filter(Boolean).join(" · ")}
          </p>
        </div>
        {pdf && <span className="rounded bg-navy px-1.5 py-0.5 text-[10px] font-bold text-white">PDF</span>}
      </div>
      <ul className="divide-y divide-line-soft dark:divide-white/10">
        {m.lessons.map((l, i) => {
          const watching = !l.isCompleted && l.position > 0;
          return (
            <li key={l.id}>
              <Link href={playerHref(courseId, l.id)} className={cn("flex items-center gap-3 px-[18px] py-3 hover:bg-background", watching && "bg-brand-soft/60 dark:bg-brand/10")}>
                <span className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold",
                  l.isCompleted ? "bg-ok text-white" : watching ? "bg-brand text-white" : "border border-line-strong text-foreground-muted dark:border-white/20")}>
                  {l.isCompleted ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-semibold text-foreground">{i + 1}. {l.title}</span>
                  <span className={cn("block truncate text-xs", watching ? "font-semibold text-brand" : "text-foreground-muted")}>
                    {l.isPdf
                      ? `${l.materials > 1 ? `${l.materials} arquivos` : "PDF"}${l.downloaded ? " · baixado" : ""}`
                      : watching && l.duration ? `${clock(l.position)} de ${clock(l.duration)} · continuar` : l.duration ? clock(l.duration) : "Vídeo"}
                  </span>
                </span>
                {l.isPdf ? (
                  <span className="inline-flex h-8 shrink-0 items-center rounded-lg border border-line-strong px-3 text-xs font-semibold text-foreground dark:border-white/10">Abrir</span>
                ) : (
                  <Play className="h-4 w-4 shrink-0 text-foreground-muted" />
                )}
              </Link>
            </li>
          );
        })}
        {m.lessons.length === 0 && <li className="px-[18px] py-6 text-center text-sm text-foreground-muted">Sem aulas publicadas.</li>}
      </ul>
    </Panel>
  );
}

// Mentoria: só a lista de aulas (sem módulos). Abre MENTORIA_RELEASE_DAYS dias após a compra;
// a trava vale também no player e na rota do PDF.
async function MentoriaView({ userId, courseId, productId }: { userId: string; courseId: string; productId: string }) {
  const [link, enrollment] = await Promise.all([
    db.courseModule.findFirst({
      where: { courseId, section: "mentoria", isPublished: true },
      orderBy: { addedAt: "asc" },
      select: { module: { select: { lessons: { where: { status: "published" }, orderBy: { order: "asc" }, select: { id: true, title: true, type: true, duration: true, videoUrl: true, videoPublicId: true, pdfUrl: true, dripDays: true } } } } },
    }),
    db.enrollment.findUnique({ where: { userId_productId: { userId, productId } } }),
  ]);
  const lessons = link?.module.lessons ?? [];
  const enrolledAt = isEnrollmentActive(enrollment) ? enrollment!.enrolledAt : null;
  const sectionUntil = enrolledAt ? lockedUntil(enrolledAt, MENTORIA_RELEASE_DAYS) : null;
  const progress = lessons.length
    ? await db.lessonProgress.findMany({ where: { userId, courseId, lessonId: { in: lessons.map((l) => l.id) } }, select: { lessonId: true, isCompleted: true } })
    : [];
  const done = new Set(progress.filter((p) => p.isCompleted).map((p) => p.lessonId));

  return (
    <>
      <div className="rounded-[14px] bg-navy p-5 text-white">
        <p className="text-[11px] font-bold uppercase tracking-wider text-brand">Mentoria</p>
        <h2 className="mt-1 text-[22px] font-extrabold">Aulas de mentoria</h2>
        <p className="mt-1 text-[13px] text-white/60">{lessons.length} aula{lessons.length !== 1 ? "s" : ""}{lessons.length ? ` · ${done.size} assistida${done.size !== 1 ? "s" : ""}` : ""}</p>
        {sectionUntil && (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-[13px] font-semibold">
            <Lock className="h-4 w-4 text-brand" /> Liberada em {releaseLabel(sectionUntil)} ({MENTORIA_RELEASE_DAYS} dias após a compra)
          </p>
        )}
      </div>
      <Panel className="overflow-hidden">
        <ul className="divide-y divide-line-soft dark:divide-white/10">
          {lessons.map((l, i) => {
            const until = enrolledAt ? lockedUntil(enrolledAt, Math.max(MENTORIA_RELEASE_DAYS, l.dripDays ?? 0)) : null;
            const isPdf = l.type === "pdf" || (!l.videoUrl && !l.videoPublicId && !!l.pdfUrl);
            const row = (
              <>
                <span className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold",
                  done.has(l.id) ? "bg-ok text-white" : "border border-line-strong text-foreground-muted dark:border-white/20")}>
                  {done.has(l.id) ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-semibold text-foreground">{l.title}</span>
                  <span className="block truncate text-xs text-foreground-muted">
                    {until ? `Libera em ${releaseLabel(until)}` : isPdf ? "PDF" : l.duration ? clock(l.duration) : "Vídeo"}
                  </span>
                </span>
                {until ? <Lock className="h-4 w-4 shrink-0 text-foreground-muted" /> : isPdf ? <FileText className="h-4 w-4 shrink-0 text-foreground-muted" /> : <Play className="h-4 w-4 shrink-0 text-foreground-muted" />}
              </>
            );
            return (
              <li key={l.id}>
                {until || !enrolledAt
                  ? <div className="flex items-center gap-3 px-[18px] py-3 opacity-70">{row}</div>
                  : <Link href={playerHref(courseId, l.id)} className="flex items-center gap-3 px-[18px] py-3 hover:bg-background">{row}</Link>}
              </li>
            );
          })}
          {lessons.length === 0 && (
            <li className="flex flex-col items-center gap-2 px-[18px] py-10 text-center text-sm text-foreground-muted">
              <Users className="h-6 w-6" /> As aulas de mentoria deste curso ainda vão ser publicadas.
            </li>
          )}
        </ul>
      </Panel>
    </>
  );
}
