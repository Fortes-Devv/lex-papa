import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PlayerClient, type PlayerModule, type PlayerLesson } from "./player-client";
import { toStudentQuiz } from "@/lib/quiz";
import { isEnrollmentActive, isStaffRole } from "@/lib/access";
import { resolveLessonVideoUrl } from "@/lib/bunny";

export default async function PlayerPage(props: { searchParams: Promise<{ courseId?: string; lessonId?: string }> }) {
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
              lessons: {
                where: isStaff ? undefined : { status: "published" },
                orderBy: { order: "asc" },
                include: { quiz: { include: { questions: { orderBy: { order: "asc" } } } } },
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
    db.lessonProgress.findMany({ where: { userId, courseId }, select: { lessonId: true, isCompleted: true } }),
    db.lessonNote.findMany({ where: { userId, lesson: { module: { courses: { some: { courseId } } } } }, select: { lessonId: true, content: true } }),
  ]);

  const completedSet = new Set(progressRows.filter((p) => p.isCompleted).map((p) => p.lessonId));
  const notesMap = Object.fromEntries(notes.map((n) => [n.lessonId, n.content]));

  const modules: PlayerModule[] = course.modules.map(({ module: m }) => ({
    id: m.id,
    title: m.title,
    lessons: m.lessons.map<PlayerLesson>((l) => {
      // Bloqueada se o aluno não está matriculado e a aula não é gratuita/preview.
      const locked = !isEnrolled && !l.isFree && !l.isPreview;
      // Aula bloqueada não leva nenhum conteúdo pago para o navegador.
      return {
        id: l.id,
        title: l.title,
        type: l.type,
        duration: l.duration,
        videoUrl: locked ? null : resolveLessonVideoUrl(l),
        hasPdf: !locked && !!l.pdfUrl,
        description: l.description,
        isFree: l.isFree,
        locked,
        isCompleted: completedSet.has(l.id),
        note: notesMap[l.id] ?? "",
        quiz: locked ? null : toStudentQuiz(l.quiz),
      };
    }),
  }));

  return (
    <PlayerClient
      courseId={course.id}
      courseTitle={course.product.title}
      modules={modules}
      initialLessonId={searchParams.lessonId}
      isEnrolled={isEnrolled}
      buyHref={`/cursos/${course.product.slug}`}
    />
  );
}
