import { db } from "@/lib/db";
import { isEnrollmentActive, isStaffRole } from "@/lib/access";

// Aula dentro de um curso específico (o mesmo módulo pode estar em vários cursos;
// progresso e tentativas de quiz são por curso). Garante que a aula está publicada,
// num módulo publicado naquele curso, e que o aluno tem matrícula válida.
export async function getEnrolledLessonInCourse(userId: string, courseId: string, lessonId: string) {
  const lesson = await db.lesson.findFirst({
    where: {
      id: lessonId,
      status: "published",
      module: { courses: { some: { courseId, isPublished: true } } },
    },
  });
  if (!lesson) return { ok: false as const, error: "Aula não encontrada neste curso." };

  const course = await db.course.findUnique({ where: { id: courseId }, include: { product: true } });
  if (!course) return { ok: false as const, error: "Curso não encontrado." };

  const enrollment = await db.enrollment.findUnique({
    where: { userId_productId: { userId, productId: course.productId } },
  });
  if (!isEnrollmentActive(enrollment)) {
    // Equipe na "Visão do aluno" estuda sem matrícula.
    const user = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!user || !isStaffRole(user.role)) return { ok: false as const, error: "Você não está matriculado neste curso." };
  }

  return { ok: true as const, lesson, course };
}

// Aulas que contam para o progresso do curso: publicadas, em módulos publicados no curso
// (só "Aulas e Materiais"; a Mentoria fica fora do progresso e dos totais).
export function courseLessonsWhere(courseId: string) {
  return { status: "published" as const, module: { courses: { some: { courseId, isPublished: true, section: "aulas" } } } };
}
