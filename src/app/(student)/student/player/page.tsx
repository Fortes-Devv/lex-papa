import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PlayerClient, type PlayerModule, type PlayerLesson } from "./player-client";
import { toStudentQuiz } from "@/lib/quiz";
import { isEnrollmentActive, isStaffRole } from "@/lib/access";
import { resolveLessonVideoUrl } from "@/lib/bunny";
import { lockedUntil, releaseLabel, sectionReleaseDays } from "@/lib/release";

export default async function PlayerPage(props: { searchParams: Promise<{ courseId?: string; lessonId?: string; aba?: string }> }) {
  const searchParams = await props.searchParams;
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = session.user.id;
  const isStaff = isStaffRole(session.user.role);

  // Se não veio courseId, usa o curso acessado mais recentemente pelo aluno.
  let courseId = searchParams.courseId;
  if (!courseId) {
    const lastEnrollment = await db.enrollment.findFirst({
      where: { userId },
      orderBy: { lastAccessedAt: "desc" },
      include: { product: { include: { course: true } } },
    });
    courseId = lastEnrollment?.product.course?.id;
  }
  if (!courseId) redirect("/student/library");

  // Aluno só enxerga módulos (publicados neste curso) e aulas publicados; a equipe vê tudo.
  const course = await db.course.findUnique({
    where: { id: courseId },
    include: {
      product: true,
      modules: {
        where: isStaff ? undefined : { isPublished: true },
        orderBy: { order: "asc" },
        include: {
          module: {
            include: {
              instructor: { select: { name: true } },
              lessons: {
                where: isStaff ? undefined : { status: "published" },
                orderBy: { order: "asc" },
                include: {
                  quiz: { include: { questions: { orderBy: { order: "asc" } } } },
                  materials: { where: { type: "pdf" }, orderBy: { createdAt: "asc" }, select: { id: true, title: true } },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!course) redirect("/student/library");

  // Controle de acesso: precisa de matrícula válida (a menos que só veja preview).
  const enrollment = await db.enrollment.findUnique({
    where: { userId_productId: { userId, productId: course.productId } },
  });
  const isEnrolled = isEnrollmentActive(enrollment);

  // Produto não publicado só abre para equipe ou quem já é matriculado.
  if (course.product.status !== "published" && !isStaff && !isEnrolled) redirect("/student/library");

  const [progressRows, notes] = await Promise.all([
    // Progresso é por curso (o mesmo módulo pode estar em outros cursos).
    db.lessonProgress.findMany({ where: { userId, courseId }, select: { lessonId: true, isCompleted: true, positionSeconds: true, updatedAt: true } }),
    db.lessonNote.findMany({ where: { userId, lesson: { module: { courses: { some: { courseId } } } } }, select: { lessonId: true, content: true } }),
  ]);

  const completedSet = new Set(progressRows.filter((p) => p.isCompleted).map((p) => p.lessonId));
  const positions = new Map(progressRows.map((p) => [p.lessonId, p.positionSeconds]));
  // Sem lessonId na URL: abre a última aula assistida (continuar de onde parou).
  const lastWatched = [...progressRows].filter((p) => p.positionSeconds > 0 && !p.isCompleted).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0]?.lessonId;
  const notesMap = Object.fromEntries(notes.map((n) => [n.lessonId, n.content]));

  // Liberação programada (só para aluno): módulo e PDFs abrem X dias após a compra.
  const enrolledAt = !isStaff && isEnrolled ? enrollment!.enrolledAt : null;

  // A aula aberta define a seção (Aulas e Materiais ou Mentoria): o player lista só ela.
  const section = course.modules.find((cm) => cm.module.lessons.some((l) => l.id === searchParams.lessonId))?.section ?? "aulas";
  const modules: PlayerModule[] = course.modules.filter((cm) => cm.section === section).map(({ module: m, releaseAfterDays, section: sec }) => {

    return {
    id: m.id,
    title: m.title,
    instructorName: m.instructor?.name ?? null,
    lessons: m.lessons.map<PlayerLesson>((l) => {
      // Liberação programada: a aula (dripDays) ou o módulo abre X dias após a compra;
      // os PDFs seguem também o prazo do curso.
      const lessonDays = Math.max(releaseAfterDays, sectionReleaseDays(sec), l.dripDays ?? 0);
      const moduleUntil = lockedUntil(enrolledAt, lessonDays);
      const pdfUntil = lockedUntil(enrolledAt, Math.max(course.pdfReleaseDays, lessonDays));
      // Sem matrícula (não existe aula grátis) ou aula ainda não liberada.
      const locked = !isEnrolled || !!moduleUntil;
      const hasFiles = !!l.pdfUrl || l.materials.length > 0;
      // Aula bloqueada não leva nenhum conteúdo pago para o navegador; PDFs só depois do prazo.
      return {
        id: l.id,
        title: l.title,
        type: l.type,
        duration: l.duration,
        videoUrl: locked ? null : resolveLessonVideoUrl(l),
        hasPdf: !locked && !pdfUntil && !!l.pdfUrl,
        materials: locked || pdfUntil ? [] : l.materials,
        releaseAt: isEnrolled && moduleUntil ? releaseLabel(moduleUntil) : null,
        pdfReleaseAt: !locked && pdfUntil && hasFiles ? releaseLabel(pdfUntil) : null,
        description: l.description,
        isFree: l.isFree,
        locked,
        isCompleted: completedSet.has(l.id),
        position: positions.get(l.id) ?? 0,
        note: notesMap[l.id] ?? "",
        quiz: locked ? null : toStudentQuiz(l.quiz),
      };
    }),
  };
  });

  return (
    <PlayerClient
      courseId={course.id}
      courseTitle={course.product.title}
      modules={modules}
      initialLessonId={searchParams.lessonId ?? lastWatched}
      initialTab={searchParams.aba === "duvidas" ? "duvidas" : undefined}
      isEnrolled={isEnrolled}
      buyHref={`/cursos/${course.product.slug}`}
    />
  );
}
