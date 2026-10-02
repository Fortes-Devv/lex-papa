import { db } from "@/lib/db";

// Engajamento de um curso (Analytics › Engajamento). Sequencial (driver Neon).
// Cartões: período escolhido. Tabela por módulo: desde o início (progresso é por curso).

const ABANDON_DAYS = 14;

export async function getCourseEngagement(courseId: string, days: number) {
  const since = new Date(Date.now() - days * 86_400_000);

  const links = await db.courseModule.findMany({
    where: { courseId },
    orderBy: { order: "asc" },
    select: {
      module: {
        select: {
          id: true, title: true, coverImage: true,
          instructor: { select: { name: true } },
          lessons: { where: { status: "published" }, select: { id: true } },
        },
      },
    },
  });
  const progress = await db.lessonProgress.findMany({
    where: { courseId },
    select: { userId: true, lessonId: true, isCompleted: true, watchedSeconds: true, updatedAt: true, completedAt: true },
  });
  const course = await db.course.findUnique({ where: { id: courseId }, select: { productId: true } });
  const enrollAgg = course
    ? await db.enrollment.aggregate({ _avg: { progress: true }, _count: { _all: true }, where: { productId: course.productId, status: { in: ["active", "completed"] } } })
    : { _avg: { progress: 0 }, _count: { _all: 0 } };

  // Cartões do período.
  const inPeriod = progress.filter((p) => p.updatedAt >= since);
  const activeStudents = new Set(inPeriod.map((p) => p.userId)).size;
  const watchedHours = Math.round(inPeriod.reduce((s, p) => s + p.watchedSeconds, 0) / 3600);
  const completedLessons = progress.filter((p) => p.isCompleted && p.completedAt && p.completedAt >= since).length;
  // PDFs baixados no período (tabela nova: se ainda não existir, conta 0).
  let pdfDownloads = 0;
  try {
    pdfDownloads = await db.downloadEvent.count({ where: { createdAt: { gte: since }, lesson: { module: { courses: { some: { courseId } } } } } });
  } catch { /* migration ainda não aplicada */ }

  // Tabela por módulo.
  const now = Date.now();
  const modules = links.map(({ module: m }) => {
    const lessonIds = new Set(m.lessons.map((l) => l.id));
    const rows = progress.filter((p) => lessonIds.has(p.lessonId));
    const byUser = new Map<string, { done: number; seconds: number; last: number }>();
    for (const r of rows) {
      const u = byUser.get(r.userId) ?? { done: 0, seconds: 0, last: 0 };
      if (r.isCompleted) u.done++;
      u.seconds += r.watchedSeconds;
      u.last = Math.max(u.last, r.updatedAt.getTime());
      byUser.set(r.userId, u);
    }
    const students = byUser.size;
    const total = lessonIds.size;
    const completion = students && total ? Math.round((Array.from(byUser.values()).reduce((s, u) => s + u.done, 0) / (students * total)) * 100) : 0;
    const abandoned = Array.from(byUser.values()).filter((u) => u.done < total && now - u.last > ABANDON_DAYS * 86_400_000).length;
    return {
      id: m.id,
      title: m.title,
      instructor: m.instructor?.name ?? null,
      lessons: total,
      students,
      completion,
      avgMinutes: students ? Math.round(Array.from(byUser.values()).reduce((s, u) => s + u.seconds, 0) / students / 60) : 0,
      abandonment: students ? Math.round((abandoned / students) * 100) : 0,
    };
  });

  return {
    activeStudents,
    baseShare: enrollAgg._count._all ? Math.round((activeStudents / enrollAgg._count._all) * 100) : 0,
    enrolled: enrollAgg._count._all,
    watchedHours,
    avgCompletion: Math.round(enrollAgg._avg.progress ?? 0),
    completedLessons,
    pdfDownloads,
    modules,
  };
}
