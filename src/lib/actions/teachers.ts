"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireModerator } from "@/lib/auth-guards";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";

// Professores: só crédito nos módulos (nome, foto, minibio). Não são usuários e não fazem login.

const teacherSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do professor.").max(120),
  bio: z.string().trim().max(500).optional(),
  avatar: z.string().trim().url().or(z.literal("")).optional(),
});

function revalidate() {
  revalidatePath("/admin/teachers");
  revalidatePath("/admin/courses");
}

export async function createTeacher(input: { name: string; bio?: string; avatar?: string }) {
  const session = await requireModerator();
  const parsed = teacherSchema.safeParse(input);
  if (!parsed.success) return { success: false as const, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const t = await db.teacher.create({ data: { name: parsed.data.name, bio: parsed.data.bio || null, avatar: parsed.data.avatar || null } });
  await logAudit({ actorId: session.user.id, action: "teacher.created", resourceType: "teacher", resourceId: t.id, metadata: { name: t.name } });
  revalidate();
  return { success: true as const, id: t.id };
}

export async function updateTeacher(id: string, input: { name: string; bio?: string; avatar?: string }) {
  const session = await requireModerator();
  const parsed = teacherSchema.safeParse(input);
  if (!parsed.success) return { success: false as const, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  await db.teacher.update({ where: { id }, data: { name: parsed.data.name, bio: parsed.data.bio || null, avatar: parsed.data.avatar || null } });
  await logAudit({ actorId: session.user.id, action: "teacher.updated", resourceType: "teacher", resourceId: id, metadata: { name: parsed.data.name } });
  revalidate();
  return { success: true as const };
}

// Excluir: os módulos dele ficam "sem professor" (o conteúdo não é afetado).
export async function deleteTeacher(id: string) {
  const session = await requireModerator();
  const t = await db.teacher.findUnique({ where: { id }, select: { name: true, _count: { select: { modules: true } } } });
  if (!t) return { success: false as const, error: "Professor não encontrado." };
  await db.teacher.delete({ where: { id } });
  await logAudit({ actorId: session.user.id, action: "teacher.deleted", resourceType: "teacher", resourceId: id, metadata: { name: t.name, modules: t._count.modules } });
  revalidate();
  return { success: true as const, message: t._count.modules ? `Professor excluído. ${t._count.modules} módulo(s) ficaram sem professor.` : "Professor excluído." };
}
