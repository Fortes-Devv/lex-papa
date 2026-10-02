"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth-guards";
import { db } from "@/lib/db";
import { awardXp } from "@/lib/gamification";
import { courseLessonsWhere, getEnrolledLessonInCourse } from "@/lib/lesson-access";

const XP_PER_LESSON = 50;

// Recalcula o progresso (0-100) da matrícula do aluno naquele curso.
async function recalcEnrollmentProgress(userId: string, courseId: string, productId: string) {
  const where = courseLessonsWhere(courseId);
  const totalLessons = await db.lesson.count({ where });
  const completed = await db.lessonProgress.count({
    where: { userId, courseId, isCompleted: true, lesson: where },
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

export async function markLessonComplete(courseId: string, lessonId: string) {
  const { user } = await requireUser();

  // Garante que a aula pertence ao curso e que o aluno está matriculado nele.
  const access = await getEnrolledLessonInCourse(user.id, courseId, lessonId);
  if (!access.ok) return { success: false as const, error: access.error };
  const { lesson, course } = access;
  const productId = course.productId;

  const where = { userId_courseId_lessonId: { userId: user.id, courseId, lessonId } };
  const existing = await db.lessonProgress.findUnique({ where });
  const alreadyDone = existing?.isCompleted ?? false;

  await db.lessonProgress.upsert({
    where,
    update: { isCompleted: true, completedAt: new Date() },
    create: { userId: user.id, courseId, lessonId, isCompleted: true, completedAt: new Date(), totalSeconds: lesson.duration ?? 0, watchedSeconds: lesson.duration ?? 0 },
  });

  if (!alreadyDone) await awardXp(user.id, XP_PER_LESSON);

  await recalcEnrollmentProgress(user.id, courseId, productId);

  revalidatePath("/student/player");
  revalidatePath("/student/dashboard");
  revalidatePath("/student/library");
  return { success: true as const, awardedXp: alreadyDone ? 0 : XP_PER_LESSON };
}

export async function saveLessonNote(lessonId: string, content: string) {
  const { user } = await requireUser();
  await db.lessonNote.upsert({
    where: { userId_lessonId: { userId: user.id, lessonId } },
    update: { content },
    create: { userId: user.id, lessonId, content },
  });
  return { success: true as const };
}

export async function addLessonComment(lessonId: string, content: string) {
  const { user } = await requireUser();
  if (!content.trim()) return { success: false as const, error: "Comentário vazio." };
  await db.comment.create({ data: { lessonId, authorId: user.id, content } });
  revalidatePath("/student/player");
  return { success: true as const };
}
