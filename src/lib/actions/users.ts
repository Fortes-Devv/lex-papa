"use server";

import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireModerator } from "@/lib/auth-guards";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import type { UserRole, UserStatus } from "@/lib/types";
import { NO_LOGIN_EMAIL_DOMAIN } from "@/lib/user-kinds";

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
  const existing = await db.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
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
  const existing = await db.user.findFirst({ where: { email: { equals: normalized, mode: "insensitive" } } });
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

// "Importar CSV": cria vários usuários de uma vez. Colunas: nome, email, papel (aluno|professor|admin).
// Separador vírgula ou ponto e vírgula; primeira linha pode ser cabeçalho. Máx. 500 linhas.
// Devolve as senhas temporárias para o admin repassar (não são guardadas em texto).
export async function importUsersCsv(csvText: string) {
  const session = await requireModerator();
  const ROLE: Record<string, UserRole> = { aluno: "student", student: "student", professor: "teacher", teacher: "teacher", admin: "admin", moderador: "moderator", moderator: "moderator" };
  const lines = csvText.replace(/^﻿/, "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { success: false as const, error: "Arquivo vazio." };
  if (lines.length > 501) return { success: false as const, error: "Máximo de 500 usuários por arquivo." };

  const results: { name: string; email: string; status: "criado" | "erro"; password?: string; error?: string }[] = [];
  for (const [i, line] of lines.entries()) {
    const cols = line.split(/[;,]/).map((c) => c.trim().replace(/^"|"$/g, ""));
    if (i === 0 && /e-?mail/i.test(line)) continue; // cabeçalho
    const [name = "", rawEmail = "", rawRole = "aluno"] = cols;
    const email = rawEmail.toLowerCase();
    const role = ROLE[rawRole.toLowerCase()] ?? null;
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { results.push({ name, email, status: "erro", error: "nome ou e-mail inválido" }); continue; }
    if (!role) { results.push({ name, email, status: "erro", error: `papel "${rawRole}" inválido` }); continue; }
    if (PRIVILEGED_ROLES.includes(role) && session.user.role !== "admin") { results.push({ name, email, status: "erro", error: "só admin cria admin/moderador" }); continue; }
    const exists = await db.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } }, select: { id: true } });
    if (exists) { results.push({ name, email, status: "erro", error: "e-mail já cadastrado" }); continue; }
    const password = crypto.randomBytes(9).toString("base64url");
    await db.user.create({ data: { name, email, role, passwordHash: await bcrypt.hash(password, 10), status: "active", emailVerified: false } });
    results.push({ name, email, status: "criado", password });
  }
  const created = results.filter((r) => r.status === "criado").length;
  await logAudit({ actorId: session.user.id, action: "user.imported", resourceType: "user", metadata: { created, errors: results.length - created } });
  revalidatePath("/admin/users");
  return { success: true as const, created, results };
}

// ── Professores (só para créditos) ──────────────────────────────────────────
// Professor não entra na plataforma: é um nome (com foto e minibio opcionais)
// que o admin associa aos módulos. O login de quem tem papel "professor" é recusado.

// E-mail interno (o banco exige um e-mail único); nunca é usado para login.
const teacherPlaceholderEmail = () => `professor-${crypto.randomBytes(6).toString("hex")}${NO_LOGIN_EMAIL_DOMAIN}`;

const teacherSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do professor.").max(120),
  bio: z.string().trim().max(500).optional(),
  avatar: z.string().trim().url().or(z.literal("")).optional(),
});

export async function createTeacherProfile(input: { name: string; bio?: string; avatar?: string }) {
  const session = await requireModerator();
  const parsed = teacherSchema.safeParse(input);
  if (!parsed.success) return { success: false as const, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const created = await db.user.create({
    data: {
      name: parsed.data.name,
      bio: parsed.data.bio || null,
      avatar: parsed.data.avatar || null,
      email: teacherPlaceholderEmail(),
      // Senha aleatória descartada: ninguém a conhece (e o login de professor é recusado).
      passwordHash: await bcrypt.hash(crypto.randomBytes(24).toString("base64url"), 10),
      role: "teacher",
      status: "active",
    },
  });
  await logAudit({ actorId: session.user.id, action: "user.created", resourceType: "user", resourceId: created.id, metadata: { role: "teacher", name: created.name } });
  revalidatePath("/admin/users");
  revalidatePath("/admin/courses");
  return { success: true as const, id: created.id };
}

export async function updateTeacherProfile(userId: string, input: { name: string; bio?: string; avatar?: string }) {
  const session = await requireModerator();
  const parsed = teacherSchema.safeParse(input);
  if (!parsed.success) return { success: false as const, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const target = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (target?.role !== "teacher") return { success: false as const, error: "Este usuário não é professor." };
  await db.user.update({ where: { id: userId }, data: { name: parsed.data.name, bio: parsed.data.bio || null, avatar: parsed.data.avatar || null } });
  await logAudit({ actorId: session.user.id, action: "user.updated", resourceType: "user", resourceId: userId, metadata: { name: parsed.data.name } });
  revalidatePath("/admin/users");
  revalidatePath("/admin/courses");
  return { success: true as const };
}
