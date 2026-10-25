"use server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isEnrollmentActive, isStaffRole } from "@/lib/access";
import { lockedUntil, sectionReleaseDays } from "@/lib/release";
import { logSecurityEvent } from "@/lib/security";

// ID do vídeo do YouTube da aula aberta no player. Só sai depois de conferir no
// servidor: login, aula publicada num módulo publicado do curso, matrícula ativa e
// prazo de liberação (aula, módulo e seção). A equipe passa direto.
// A lista de aulas do player nunca leva esses IDs: cada aula pede o seu ao abrir.
export async function getLessonYoutubeId(courseId: string, lessonId: string): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const user = (await auth())?.user;
  if (!user) return { ok: false, error: "Sua sessão expirou. Entre de novo." };
  const staff = isStaffRole(user.role);

  const lesson = await db.lesson.findFirst({
    where: {
      id: lessonId,
      ...(staff ? {} : { status: "published" as const }),
      module: { courses: { some: { courseId, ...(staff ? {} : { isPublished: true }) } } },
    },
    select: {
      videoProvider: true,
      youtubeId: true,
      dripDays: true,
      module: { select: { courses: { where: { courseId }, select: { releaseAfterDays: true, section: true } } } },
    },
  });
  if (!lesson || lesson.videoProvider !== "youtube" || !lesson.youtubeId) return { ok: false, error: "Vídeo não encontrado." };
  if (staff) return { ok: true, id: lesson.youtubeId };

  const course = await db.course.findUnique({ where: { id: courseId }, select: { productId: true } });
  const enrollment = course
    ? await db.enrollment.findUnique({ where: { userId_productId: { userId: user.id, productId: course.productId } } })
    : null;
  if (!isEnrollmentActive(enrollment)) {
    await logSecurityEvent({ type: "access_denied", severity: "medium", userId: user.id, sessionId: user.sid, resource: `video:${lessonId}`, reason: "vídeo pedido sem matrícula ativa" });
    return { ok: false, error: "Você não tem acesso a esta aula." };
  }

  const link = lesson.module.courses[0];
  const days = Math.max(link?.releaseAfterDays ?? 0, sectionReleaseDays(link?.section ?? "aulas"), lesson.dripDays ?? 0);
  if (lockedUntil(enrollment!.enrolledAt, days)) return { ok: false, error: "Esta aula ainda não foi liberada." };

  return { ok: true, id: lesson.youtubeId };
}
