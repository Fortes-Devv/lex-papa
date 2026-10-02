import { db } from "@/lib/db";
import { courseLessonsWhere } from "@/lib/lesson-access";

// Fora de "use server" de propósito: são helpers internos, não endpoints.

// Totais exibidos na vitrine: aulas publicadas em módulos publicados no curso.
export async function recalcCourseTotals(courseId: string) {
  const lessons = await db.lesson.findMany({ where: courseLessonsWhere(courseId), select: { duration: true } });
  await db.course.update({
    where: { id: courseId },
    data: {
      totalLessons: lessons.length,
      totalDuration: lessons.reduce((sum, l) => sum + (l.duration ?? 0), 0),
    },
  });
}

// Recalcula todos os cursos que usam o módulo.
export async function recalcTotalsForModule(moduleId: string) {
  const links = await db.courseModule.findMany({ where: { moduleId }, select: { courseId: true } });
  for (const l of links) await recalcCourseTotals(l.courseId);
}
