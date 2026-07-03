"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { awardXp } from "@/lib/gamification";

const XP_PER_LESSON = 50;

async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");
  return session.user;
}

// Recalcula o progresso (0-100) da matrícula do aluno naquele curso.
async function recalcEnrollmentProgress(userId: string, courseId: string, productId: string) {
  const totalLessons = await db.lesson.count({ where: { module: { courseId } } });
  const completed = await db.lessonProgress.count({
    where: { userId, isCompleted: true, lesson: { module: { courseId } } },
  });
  const progress = totalLessons > 0 ? Math.round((completed / totalLessons) * 100) : 0;

  await db.enrollment.updateMany({
    where: { userId, productId },
    data: {
      progress,
      lastAccessedAt: new Date(),
      status: progress === 100 ? "completed" : "active",
      completedAt: progress === 100 ? new Date() : null,
    },
  });

  return { progress, isComplete: progress === 100 };
}

export async function markLessonComplete(lessonId: string) {
  const user = await requireUser();

  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    include: { module: { include: { course: { include: { product: true } } } } },
  });
  if (!lesson) return { success: false as const, error: "Aula não encontrada." };

  const courseId = lesson.module.courseId;
  const productId = lesson.module.course.productId;

  // Garante que o aluno está matriculado no curso.
  const enrollment = await db.enrollment.findUnique({
    where: { userId_productId: { userId: user.id, productId } },
  });
  if (!enrollment) return { success: false as const, error: "Você não está matriculado neste curso." };

  const existing = await db.lessonProgress.findUnique({
    where: { userId_lessonId: { userId: user.id, lessonId } },
  });
  const alreadyDone = existing?.isCompleted ?? false;

  await db.lessonProgress.upsert({
    where: { userId_lessonId: { userId: user.id, lessonId } },
    update: { isCompleted: true, completedAt: new Date() },
    create: { userId: user.id, lessonId, isCompleted: true, completedAt: new Date(), totalSeconds: lesson.duration ?? 0, watchedSeconds: lesson.duration ?? 0 },
  });

  if (!alreadyDone) await awardXp(user.id, XP_PER_LESSON);

  const { isComplete } = await recalcEnrollmentProgress(user.id, courseId, productId);

  // Emite certificado ao concluir 100% (se o curso oferece).
  if (isComplete && lesson.module.course.completionCertificate) {
    const hasCert = await db.certificate.findFirst({ where: { userId: user.id, productId } });
    if (!hasCert) {
      await db.certificate.create({
        data: {
          userId: user.id,
          productId,
          code: `CERT-${Date.now().toString(36).toUpperCase()}-${user.id.slice(-4).toUpperCase()}`,
          downloadUrl: "",
        },
      });
      await db.notification.create({
        data: { userId: user.id, type: "achievement", title: "Certificado emitido!", message: `Parabéns por concluir ${lesson.module.course.product.title}.`, link: "/student/certificates" },
      });
    }
  }

  revalidatePath("/student/player");
  revalidatePath("/student/dashboard");
  revalidatePath("/student/library");
  return { success: true as const, awardedXp: alreadyDone ? 0 : XP_PER_LESSON };
}

export async function saveLessonNote(lessonId: string, content: string) {
  const user = await requireUser();
  await db.lessonNote.upsert({
    where: { userId_lessonId: { userId: user.id, lessonId } },
    update: { content },
    create: { userId: user.id, lessonId, content },
  });
  return { success: true as const };
}

export async function addLessonComment(lessonId: string, content: string) {
  const user = await requireUser();
  if (!content.trim()) return { success: false as const, error: "Comentário vazio." };
  await db.comment.create({ data: { lessonId, authorId: user.id, content } });
  revalidatePath("/student/player");
  return { success: true as const };
}
