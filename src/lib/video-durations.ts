import { db } from "@/lib/db";
import { getBunnyVideoStatus, isBunnyConfigured } from "@/lib/bunny";
import { recalcCourseTotals } from "@/lib/course-totals";

// Vídeos importados por link (Google Drive) chegam sem duração: o Bunny só a
// conhece depois de processar. Ao abrir o quadro do curso, completa até 5 por vez (só aulas da última semana).
export async function syncPendingDurations(courseId: string) {
  if (!isBunnyConfigured()) return;
  const pending = await db.lesson.findMany({
    where: { module: { courses: { some: { courseId } } }, videoProvider: "bunny", videoPublicId: { not: null }, duration: null, createdAt: { gt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    select: { id: true, videoPublicId: true },
    take: 5,
  });
  let changed = false;
  for (const l of pending) {
    try {
      const { length } = await getBunnyVideoStatus(l.videoPublicId!);
      if (length > 0) {
        await db.lesson.update({ where: { id: l.id }, data: { duration: Math.round(length) } });
        changed = true;
      }
    } catch {
      // Bunny fora do ar ou vídeo apagado: tenta de novo na próxima abertura.
    }
  }
  if (changed) await recalcCourseTotals(courseId);
}
