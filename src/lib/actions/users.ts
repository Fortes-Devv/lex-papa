"use server";

import bcrypt from "bcryptjs";
import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import type { UserRole, UserStatus } from "@/lib/types";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "admin" && session.user.role !== "moderator")) {
    throw new Error("Não autorizado.");
  }
  return session;
}

export async function createUserByAdmin(input: { name: string; email: string; role: UserRole }) {
  const session = await requireAdmin();

  const existing = await db.user.findUnique({ where: { email: input.email } });
  if (existing) {
    return { success: false as const, error: "Este email já está cadastrado." };
  }

  const tempPassword = crypto.randomBytes(9).toString("base64url");
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  const created = await db.user.create({
    data: {
      name: input.name,
      email: input.email,
      role: input.role,
      passwordHash,
      status: "active",
      emailVerified: false,
    },
  });

  await logAudit({ actorId: session.user.id, action: "user.created", resourceType: "user", resourceId: created.id, metadata: { email: input.email, role: input.role } });
  revalidatePath("/admin/users");
  return { success: true as const, tempPassword };
}

export async function updateUserRole(userId: string, role: UserRole) {
  const session = await requireAdmin();
  if (session.user.id === userId) {
    return { success: false as const, error: "Você não pode alterar o próprio papel." };
  }
  await db.user.update({ where: { id: userId }, data: { role } });
  await logAudit({ actorId: session.user.id, action: "user.updated", resourceType: "user", resourceId: userId, metadata: { role } });
  revalidatePath("/admin/users");
  return { success: true as const };
}

export async function updateUserEmail(userId: string, email: string) {
  const session = await requireAdmin();
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
  const session = await requireAdmin();
  if (session.user.id === userId) {
    return { success: false as const, error: "Você não pode alterar o próprio status." };
  }
  await db.user.update({ where: { id: userId }, data: { status } });
  await logAudit({ actorId: session.user.id, action: status === "banned" ? "user.banned" : "user.updated", resourceType: "user", resourceId: userId, metadata: { status } });
  revalidatePath("/admin/users");
  return { success: true as const };
}
