"use server";

import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireModerator } from "@/lib/auth-guards";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import type { UserRole, UserStatus } from "@/lib/types";

const roleSchema = z.enum(["admin", "moderator", "teacher", "student"]);
const statusSchema = z.enum(["active", "inactive", "banned", "pending"]);

// Papéis que só um admin pode atribuir ou gerenciar.
const PRIVILEGED_ROLES = ["admin", "moderator"];

const forbidden = { success: false as const, error: "Somente administradores podem fazer isso." };

// Moderador só gerencia alunos e professores; admin gerencia todos.
async function canManageUser(actorRole: string, targetUserId: string) {
  if (actorRole === "admin") return true;
  const target = await db.user.findUnique({ where: { id: targetUserId }, select: { role: true } });
  return !!target && !PRIVILEGED_ROLES.includes(target.role);
}

export async function createUserByAdmin(input: { name: string; email: string; role: UserRole }) {
  const session = await requireModerator();
  const parsedRole = roleSchema.safeParse(input.role);
  if (!parsedRole.success) return { success: false as const, error: "Papel inválido." };
  const role = parsedRole.data;
  if (PRIVILEGED_ROLES.includes(role) && session.user.role !== "admin") return forbidden;

  const email = input.email.trim().toLowerCase();
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return { success: false as const, error: "Este email já está cadastrado." };
  }

  const tempPassword = crypto.randomBytes(9).toString("base64url");
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  const created = await db.user.create({
    data: {
      name: input.name,
      email,
      role,
      passwordHash,
      status: "active",
      emailVerified: false,
    },
  });

  await logAudit({ actorId: session.user.id, action: "user.created", resourceType: "user", resourceId: created.id, metadata: { email, role } });
  revalidatePath("/admin/users");
  return { success: true as const, tempPassword };
}

export async function updateUserRole(userId: string, role: UserRole) {
  const session = await requireModerator();
  if (session.user.role !== "admin") return forbidden;
  const parsedRole = roleSchema.safeParse(role);
  if (!parsedRole.success) return { success: false as const, error: "Papel inválido." };
  if (session.user.id === userId) {
    return { success: false as const, error: "Você não pode alterar o próprio papel." };
  }
  await db.user.update({ where: { id: userId }, data: { role: parsedRole.data } });
  await logAudit({ actorId: session.user.id, action: "user.updated", resourceType: "user", resourceId: userId, metadata: { role: parsedRole.data } });
  revalidatePath("/admin/users");
  return { success: true as const };
}

export async function updateUserEmail(userId: string, email: string) {
  const session = await requireModerator();
  if (!(await canManageUser(session.user.role, userId))) return forbidden;
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return { success: false as const, error: "Email inválido." };
  }
  const existing = await db.user.findUnique({ where: { email: normalized } });
  if (existing && existing.id !== userId) {
    return { success: false as const, error: "Este email já está em uso por outra conta." };
  }
  await db.user.update({ where: { id: userId }, data: { email: normalized } });
  await logAudit({ actorId: session.user.id, action: "user.updated", resourceType: "user", resourceId: userId, metadata: { email: normalized } });
  revalidatePath("/admin/users");
  return { success: true as const };
}

export async function updateUserStatus(userId: string, status: UserStatus) {
  const session = await requireModerator();
  const parsedStatus = statusSchema.safeParse(status);
  if (!parsedStatus.success) return { success: false as const, error: "Status inválido." };
  if (session.user.id === userId) {
    return { success: false as const, error: "Você não pode alterar o próprio status." };
  }
  if (!(await canManageUser(session.user.role, userId))) return forbidden;
  await db.user.update({ where: { id: userId }, data: { status: parsedStatus.data } });
  await logAudit({ actorId: session.user.id, action: parsedStatus.data === "banned" ? "user.banned" : "user.updated", resourceType: "user", resourceId: userId, metadata: { status: parsedStatus.data } });
  revalidatePath("/admin/users");
  return { success: true as const };
}
