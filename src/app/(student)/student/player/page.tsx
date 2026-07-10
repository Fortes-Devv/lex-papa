import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PlayerClient, type PlayerModule, type PlayerLesson } from "./player-client";
import { toStudentQuiz } from "@/lib/quiz";

export default async function PlayerPage({ searchParams }: { searchParams: { courseId?: string; lessonId?: string } }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = session.user.id;

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

  const course = await db.course.findUnique({
    where: { id: courseId },
    include: {
      product: true,
      modules: {
        orderBy: { order: "asc" },
        include: {
          lessons: {
            orderBy: { order: "asc" },
            include: { quiz: { include: { questions: { orderBy: { order: "asc" } } } } },
          },
        },
      },
    },
  });
  if (!course) redirect("/student/library");

  // Controle de acesso: precisa estar matriculado (a menos que só veja preview).
  const enrollment = await db.enrollment.findUnique({
    where: { userId_productId: { userId, productId: course.productId } },
  });
  const isEnrolled = !!enrollment;

  const [progressRows, notes] = await Promise.all([
    db.lessonProgress.findMany({ where: { userId, lesson: { module: { courseId } } }, select: { lessonId: true, isCompleted: true } }),
    db.lessonNote.findMany({ where: { userId, lesson: { module: { courseId } } }, select: { lessonId: true, content: true } }),
  ]);

  const completedSet = new Set(progressRows.filter((p) => p.isCompleted).map((p) => p.lessonId));
  const notesMap = Object.fromEntries(notes.map((n) => [n.lessonId, n.content]));

  const modules: PlayerModule[] = course.modules.map((m) => ({
    id: m.id,
    title: m.title,
    lessons: m.lessons.map<PlayerLesson>((l) => ({
      id: l.id,
      title: l.title,
      type: l.type,
      duration: l.duration,
      videoUrl: l.videoUrl,
      pdfUrl: l.pdfUrl,
      description: l.description,
      isFree: l.isFree,
      // Bloqueada se o aluno não está matriculado e a aula não é gratuita/preview.
      locked: !isEnrolled && !l.isFree && !l.isPreview,
      isCompleted: completedSet.has(l.id),
      note: notesMap[l.id] ?? "",
      quiz: toStudentQuiz(l.quiz),
    })),
  }));

  return (
    <PlayerClient
      courseTitle={course.product.title}
      modules={modules}
      initialLessonId={searchParams.lessonId}
      isEnrolled={isEnrolled}
    />
  );
}
