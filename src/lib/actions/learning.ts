"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth-guards";
import { db } from "@/lib/db";
import { awardXp } from "@/lib/gamification";
import { courseLessonsWhere, getEnrolledLessonInCourse } from "@/lib/lesson-access";
import { isStaffRole } from "@/lib/access";
import { dayKey } from "@/lib/student-area";

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

// Chamado pelo player a cada ~20 s de vídeo e ao pausar: guarda onde o aluno
// parou e soma o tempo de estudo do dia (meta da semana, horas estudadas).
export async function saveWatchProgress(courseId: string, lessonId: string, position: number, duration: number, watched: number) {
  const { user } = await requireUser();
  const access = await getEnrolledLessonInCourse(user.id, courseId, lessonId);
  if (!access.ok) return { success: false as const };
  const total = Math.max(0, Math.round(duration) || 0);
  const pos = Math.max(0, Math.min(Math.round(position) || 0, total || 24 * 3600));
  const add = Math.max(0, Math.min(Math.round(watched) || 0, 90)); // no máximo 90 s por chamada

  await db.lessonProgress.upsert({
    where: { userId_courseId_lessonId: { userId: user.id, courseId, lessonId } },
    update: { positionSeconds: pos, ...(total ? { totalSeconds: total } : {}), watchedSeconds: { increment: add } },
    create: { userId: user.id, courseId, lessonId, positionSeconds: pos, totalSeconds: total, watchedSeconds: add },
  });
  if (add > 0) {
    const date = dayKey();
    await db.studyDay.upsert({
      where: { userId_date: { userId: user.id, date } },
      update: { seconds: { increment: add } },
      create: { userId: user.id, date, seconds: add },
    });
  }
  await db.enrollment.updateMany({ where: { userId: user.id, productId: access.course.productId }, data: { lastAccessedAt: new Date() } });
  return { success: true as const };
}

// Meta de estudo da semana (Perfil › Preferências de estudo).
export async function setWeeklyGoal(minutes: number) {
  const { user } = await requireUser();
  const value = Math.max(30, Math.min(Math.round(minutes) || 0, 60 * 60));
  await db.user.update({ where: { id: user.id }, data: { weeklyGoalMinutes: value } });
  revalidatePath("/student/dashboard");
  revalidatePath("/student/progress");
  return { success: true as const };
}

// Dúvidas da aula: aluno matriculado pergunta; equipe (professor/admin) responde no mesmo tópico.
async function canUseLessonQuestions(userId: string, role: string, courseId: string, lessonId: string) {
  if (isStaffRole(role)) return true;
  return (await getEnrolledLessonInCourse(userId, courseId, lessonId)).ok;
}

export async function listLessonQuestions(courseId: string, lessonId: string) {
  const { user } = await requireUser();
  if (!(await canUseLessonQuestions(user.id, user.role, courseId, lessonId))) return { success: false as const, error: "Sem acesso a esta aula." };
  const rows = await db.comment.findMany({
    where: { lessonId, status: "published" },
    orderBy: { createdAt: "asc" },
    take: 200,
    select: { id: true, content: true, createdAt: true, author: { select: { id: true, name: true, avatar: true, role: true } } },
  });
  return {
    success: true as const,
    items: rows.map((r) => ({
      id: r.id, content: r.content, createdAt: r.createdAt.toISOString(),
      authorName: r.author.name, authorAvatar: r.author.avatar, isStaff: isStaffRole(r.author.role), isMine: r.author.id === user.id,
    })),
  };
}

export async function askLessonQuestion(courseId: string, lessonId: string, content: string) {
  const { user } = await requireUser();
  const text = content.trim().slice(0, 2000);
  if (!text) return { success: false as const, error: "Escreva sua dúvida." };
  if (!(await canUseLessonQuestions(user.id, user.role, courseId, lessonId))) return { success: false as const, error: "Sem acesso a esta aula." };
  await db.comment.create({ data: { lessonId, authorId: user.id, content: text } });
  return { success: true as const };
}
