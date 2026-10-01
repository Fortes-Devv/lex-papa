import type { Session } from "next-auth";
import { db } from "@/lib/db";

// Regras de edição de conteúdo:
// - Curso (estrutura: dados, módulos que usa, ordem, publicação): admin/moderador
//   sempre; professor só se for instrutor do produto.
// - Módulo (conteúdo: aulas, vídeos, quiz): admin/moderador sempre; professor só
//   se for o dono do módulo (instructorId). Um módulo pode estar em vários cursos.

type SessionUser = Pick<Session["user"], "id" | "role">;

const isManager = (user: SessionUser) => user.role === "admin" || user.role === "moderator";

export async function canEditCourse(user: SessionUser, courseId: string) {
  if (isManager(user)) return true;
  if (user.role !== "teacher") return false;
  const owns = await db.course.count({ where: { id: courseId, product: { instructors: { some: { id: user.id } } } } });
  return owns > 0;
}

export async function canEditProduct(user: SessionUser, productId: string) {
  if (isManager(user)) return true;
  if (user.role !== "teacher") return false;
  const owns = await db.product.count({ where: { id: productId, instructors: { some: { id: user.id } } } });
  return owns > 0;
}

export async function canEditModule(user: SessionUser, moduleId: string) {
  if (isManager(user)) return true;
  if (user.role !== "teacher") return false;
  const owns = await db.module.count({ where: { id: moduleId, instructorId: user.id } });
  return owns > 0;
}

export async function canEditLesson(user: SessionUser, lessonId: string) {
  const lesson = await db.lesson.findUnique({ where: { id: lessonId }, select: { moduleId: true } });
  return !!lesson && canEditModule(user, lesson.moduleId);
}

export const NOT_ALLOWED = { success: false as const, error: "Você não tem permissão para editar este conteúdo." };
