"use server";

import bcrypt from "bcryptjs";
import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { UserRole, UserStatus } from "@/lib/types";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "admin" && session.user.role !== "moderator")) {
    throw new Error("Não autorizado.");
  }
  return session;
}

export async function createUserByAdmin(input: { name: string; email: string; role: UserRole }) {
  await requireAdmin();

  const existing = await db.user.findUnique({ where: { email: input.email } });
  if (existing) {
    return { success: false as const, error: "Este email já está cadastrado." };
  }

  const tempPassword = crypto.randomBytes(9).toString("base64url");
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  await db.user.create({
    data: {
      name: input.name,
      email: input.email,
      role: input.role,
      passwordHash,
      status: "active",
      emailVerified: false,
    },
  });

  revalidatePath("/admin/users");
  return { success: true as const, tempPassword };
}

export async function updateUserRole(userId: string, role: UserRole) {
  const session = await requireAdmin();
  if (session.user.id === userId) {
    return { success: false as const, error: "Você não pode alterar o próprio papel." };
  }
  await db.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/admin/users");
  return { success: true as const };
}

export async function updateUserStatus(userId: string, status: UserStatus) {
  const session = await requireAdmin();
  if (session.user.id === userId) {
    return { success: false as const, error: "Você não pode alterar o próprio status." };
  }
  await db.user.update({ where: { id: userId }, data: { status } });
  revalidatePath("/admin/users");
  return { success: true as const };
}
