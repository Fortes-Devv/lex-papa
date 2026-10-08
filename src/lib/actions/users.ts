"use server";

import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin, requireModerator } from "@/lib/auth-guards";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import type { UserRole, UserStatus } from "@/lib/types";
import { invalidEmailReason } from "@/lib/email-check";

// Professor não é usuário (cadastro próprio em Professores).
const roleSchema = z.enum(["admin", "moderator", "student"]);
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
  const badEmail = invalidEmailReason(email);
  if (badEmail) return { success: false as const, error: badEmail };
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
  const badEmail = invalidEmailReason(normalized);
  if (badEmail) return { success: false as const, error: badEmail };
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
  const ROLE: Record<string, UserRole> = { aluno: "student", student: "student", admin: "admin", moderador: "moderator", moderator: "moderator" };
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
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || invalidEmailReason(email)) { results.push({ name, email, status: "erro", error: "nome ou e-mail inválido" }); continue; }
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

// ── Suporte ao aluno (só admin) ─────────────────────────────────────────────

// Senha temporária: o admin repassa ao aluno (ex.: WhatsApp) quando o e-mail de redefinição não ajuda.
export async function setTemporaryPassword(userId: string) {
  const session = await requireAdmin();
  const user = await db.user.findUnique({ where: { id: userId }, select: { role: true, email: true } });
  if (!user) return { success: false as const, error: "Usuário não encontrado." };
  if (userId === session.user.id) return { success: false as const, error: "Para a sua conta, use Meu perfil › Senha." };
  const tempPassword = crypto.randomBytes(6).toString("base64url");
  await db.user.update({ where: { id: userId }, data: { passwordHash: await bcrypt.hash(tempPassword, 10) } });
  // Libera o bloqueio de tentativas de login desse e-mail.
  await db.rateLimitHit.deleteMany({ where: { key: { contains: user.email.toLowerCase() } } });
  await logAudit({ actorId: session.user.id, action: "user.password_reset_by_admin", resourceType: "user", resourceId: userId });
  return { success: true as const, tempPassword };
}

// Move cursos (matrículas) e pedidos para outra conta — ex.: aluno que comprou numa conta
// criada com e-mail digitado errado. Se a conta de destino já tem o curso, fica o acesso mais longo.
export async function transferPurchases(fromUserId: string, toEmail: string) {
  const session = await requireAdmin();
  const target = await db.user.findFirst({ where: { email: { equals: toEmail.trim().toLowerCase(), mode: "insensitive" } }, select: { id: true, role: true, name: true } });
  if (!target) return { success: false as const, error: "Nenhuma conta com esse e-mail." };
  if (target.id === fromUserId) return { success: false as const, error: "Escolha outra conta de destino." };
  if (target.role !== "student") return { success: false as const, error: "A conta de destino precisa ser de aluno." };

  const enrollments = await db.enrollment.findMany({ where: { userId: fromUserId } });
  let moved = 0;
  for (const e of enrollments) {
    const existing = await db.enrollment.findUnique({ where: { userId_productId: { userId: target.id, productId: e.productId } } });
    if (!existing) {
      await db.enrollment.update({ where: { id: e.id }, data: { userId: target.id } });
    } else {
      const longer = !existing.expiresAt || (e.expiresAt && e.expiresAt <= existing.expiresAt) ? existing.expiresAt : e.expiresAt;
      await db.enrollment.update({ where: { id: existing.id }, data: { status: "active", expiresAt: longer } });
      await db.enrollment.delete({ where: { id: e.id } });
    }
    moved++;
  }
  const orders = await db.order.updateMany({ where: { userId: fromUserId }, data: { userId: target.id } });
  await logAudit({ actorId: session.user.id, action: "user.purchases_transferred", resourceType: "user", resourceId: fromUserId, metadata: { to: target.id, courses: moved, orders: orders.count } });
  revalidatePath("/admin/users");
  return { success: true as const, message: `${moved} curso(s) e ${orders.count} pedido(s) movidos para ${target.name}.` };
}

// Exclui conta sem compras (duplicada, teste). Com pedido ou matrícula, recusa (histórico financeiro).
export async function deleteUserWithoutPurchases(userId: string) {
  const session = await requireAdmin();
  if (userId === session.user.id) return { success: false as const, error: "Você não pode excluir a própria conta." };
  const user = await db.user.findUnique({ where: { id: userId }, select: { role: true, email: true, _count: { select: { orders: true, enrollments: true } } } });
  if (!user) return { success: false as const, error: "Usuário não encontrado." };
  if (user.role === "admin" || user.role === "moderator") return { success: false as const, error: "Contas da equipe não podem ser excluídas aqui." };
  if (user._count.orders > 0 || user._count.enrollments > 0) {
    return { success: false as const, error: "Esta conta tem compras. Mova os cursos para a conta certa antes de excluir." };
  }
  try {
    await db.user.delete({ where: { id: userId } });
  } catch {
    return { success: false as const, error: "Não foi possível excluir: há registros ligados a esta conta." };
  }
  await logAudit({ actorId: session.user.id, action: "user.deleted", resourceType: "user", resourceId: userId, metadata: { email: user.email.replace(/^(.{3}).*(@.*)$/, "$1***$2") } });
  revalidatePath("/admin/users");
  return { success: true as const, message: "Conta excluída." };
}

// "Editar dados" do usuário pelo admin: nome, e-mail, telefone e situação.
export async function updateUserByAdmin(userId: string, input: { name: string; email: string; phone?: string; status: UserStatus }) {
  const session = await requireAdmin();
  const name = input.name.trim();
  if (name.length < 2) return { success: false as const, error: "Informe o nome." };
  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { success: false as const, error: "E-mail inválido." };
  const badEmail = invalidEmailReason(email);
  if (badEmail) return { success: false as const, error: badEmail };
  const status = statusSchema.safeParse(input.status);
  if (!status.success) return { success: false as const, error: "Situação inválida." };
  if (userId === session.user.id && status.data !== "active") return { success: false as const, error: "Você não pode bloquear a própria conta." };
  const other = await db.user.findFirst({ where: { email: { equals: email, mode: "insensitive" }, NOT: { id: userId } }, select: { id: true } });
  if (other) return { success: false as const, error: "Este e-mail já está em uso por outra conta. Se for a mesma pessoa, use “Mover cursos para outra conta”." };
  await db.user.update({ where: { id: userId }, data: { name, email, phone: input.phone?.trim() || null, status: status.data } });
  await logAudit({ actorId: session.user.id, action: "user.updated", resourceType: "user", resourceId: userId, metadata: { name, email, status: status.data } });
  revalidatePath("/admin/users");
  return { success: true as const };
}
