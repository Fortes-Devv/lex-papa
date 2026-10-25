"use server";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireModerator } from "@/lib/auth-guards";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { logSecurityEvent, revokeSession, revokeUserSessions } from "@/lib/security";

// ── Aluno ──────────────────────────────────────────────────────────────────

// Perfil › "Sair dos outros aparelhos": desconecta tudo menos este aparelho.
export async function signOutOtherDevices() {
  const session = await auth();
  if (!session?.user) return { success: false as const, error: "Sua sessão expirou. Entre de novo." };
  const count = await revokeUserSessions(session.user.id, "saiu pelos outros aparelhos", "user", session.user.sid);
  await logSecurityEvent({ type: "session_revoked", severity: "low", userId: session.user.id, sessionId: session.user.sid, reason: `o próprio aluno desconectou ${count} aparelho(s)` });
  revalidatePath("/student/profile");
  return { success: true as const, count };
}

// ── Equipe ─────────────────────────────────────────────────────────────────

export async function adminRevokeSession(sessionId: string) {
  const session = await requireModerator();
  const target = await db.userSession.findUnique({ where: { id: sessionId }, select: { userId: true } });
  if (!target) return { success: false as const, error: "Sessão não encontrada." };
  await revokeSession(sessionId, "desconectado pelo admin", session.user.id);
  await logSecurityEvent({ type: "session_revoked", severity: "medium", userId: target.userId, sessionId, reason: "desconectado pelo admin" });
  await logAudit({ actorId: session.user.id, action: "user.session_revoked", resourceType: "user", resourceId: target.userId });
  revalidatePath("/admin/security");
  return { success: true as const };
}

export async function adminRevokeUserSessions(userId: string) {
  const session = await requireModerator();
  if (userId === session.user.id) return { success: false as const, error: "Para a sua conta, use Sair." };
  const count = await revokeUserSessions(userId, "desconectado pelo admin", session.user.id);
  await logSecurityEvent({ type: "session_revoked", severity: "medium", userId, reason: `admin desconectou ${count} aparelho(s)` });
  await logAudit({ actorId: session.user.id, action: "user.sessions_revoked", resourceType: "user", resourceId: userId, metadata: { count } });
  revalidatePath("/admin/security");
  return { success: true as const, count };
}
