import { db } from "@/lib/db";

// Sessões de login e eventos de segurança (gravados só pelo servidor).
// Fora de "use server" de propósito: helpers internos, não endpoints.

// Aparelhos conectados ao mesmo tempo por aluno. No login do 3º, o mais antigo sai.
// A equipe não tem limite.
export const MAX_STUDENT_SESSIONS = 2;
// De quanto em quanto tempo a mesma sessão é conferida no banco (por instância).
const CHECK_TTL_MS = 60_000;
const SEEN_EVERY_MS = 5 * 60_000;

// ── Minimização de dados (LGPD) ────────────────────────────────────────────
export function ipPrefix(ip: string | null | undefined): string | null {
  if (!ip || ip === "unknown") return null;
  if (ip.includes(".")) return ip.split(".").slice(0, 3).join(".") + ".x";
  return ip.split(":").slice(0, 3).join(":") + "::";
}

export function deviceFrom(ua: string | null | undefined): string | null {
  if (!ua) return null;
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /SamsungBrowser/.test(ua) ? "Samsung Internet"
    : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Navegador";
  const os = /iPhone|iPad/.test(ua) ? "iPhone/iPad" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows"
    : /Mac OS X/.test(ua) ? "Mac" : /Linux/.test(ua) ? "Linux" : "outro sistema";
  return `${browser} · ${os}`;
}

export function requestInfo(h: Headers) {
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip");
  return { ipPrefix: ipPrefix(ip), device: deviceFrom(h.get("user-agent")) };
}

// ── Eventos ────────────────────────────────────────────────────────────────
export type SecuritySeverity = "low" | "medium" | "high";
export async function logSecurityEvent(e: {
  type: string; severity: SecuritySeverity; userId?: string | null; email?: string | null; sessionId?: string | null;
  resource?: string | null; ipPrefix?: string | null; device?: string | null; reason?: string | null;
}) {
  try {
    await db.securityEvent.create({
      data: {
        type: e.type, severity: e.severity, userId: e.userId ?? null, email: e.email?.slice(0, 200) ?? null, sessionId: e.sessionId ?? null,
        resource: e.resource?.slice(0, 200) ?? null, ipPrefix: e.ipPrefix ?? null, device: e.device ?? null, reason: e.reason?.slice(0, 300) ?? null,
      },
    });
    // Retenção: eventos leves por 90 dias, os demais por 1 ano.
    if (Math.random() < 0.02) {
      const day = 86_400_000;
      await db.securityEvent.deleteMany({ where: { OR: [
        { severity: "low", createdAt: { lt: new Date(Date.now() - 90 * day) } },
        { createdAt: { lt: new Date(Date.now() - 365 * day) } },
      ] } });
      await db.userSession.deleteMany({ where: { revokedAt: { lt: new Date(Date.now() - 90 * day) } } });
    }
  } catch (err) {
    console.error("[security] não foi possível registrar o evento:", err);
  }
}

// ── Sessões ────────────────────────────────────────────────────────────────
// Login: cria a sessão do aparelho e, para aluno, desconecta os mais antigos além do limite.
export async function openSession(user: { id: string; role: string }, info: { ipPrefix: string | null; device: string | null }) {
  const session = await db.userSession.create({ data: { userId: user.id, ipPrefix: info.ipPrefix, device: info.device } });
  if (user.role === "student") {
    const active = await db.userSession.findMany({
      where: { userId: user.id, revokedAt: null },
      orderBy: { lastSeenAt: "desc" },
      select: { id: true, device: true },
    });
    const extra = active.slice(MAX_STUDENT_SESSIONS);
    if (extra.length) {
      await db.userSession.updateMany({
        where: { id: { in: extra.map((s) => s.id) } },
        data: { revokedAt: new Date(), revokeReason: "limite de aparelhos", revokedBy: "system" },
      });
      await logSecurityEvent({
        type: "session_limit", severity: "low", userId: user.id, sessionId: session.id, ...info,
        reason: `Entrou num ${MAX_STUDENT_SESSIONS + 1}º aparelho; desconectado: ${extra.map((s) => s.device ?? "aparelho").join(", ")}`,
      });
    }
  }
  return session.id;
}

type Check = { ok: true; role: string; name: string } | { ok: false; reason: string };
const cache = new Map<string, { at: number; result: Check }>();

// Confere se a sessão continua ativa e a conta liberada. Resultado guardado por 1 min
// por instância (cada página chama auth() várias vezes).
export async function checkSession(sessionId: string, userId: string): Promise<Check> {
  const hit = cache.get(sessionId);
  if (hit && Date.now() - hit.at < CHECK_TTL_MS) return hit.result;
  let result: Check;
  try {
    const s = await db.userSession.findUnique({
      where: { id: sessionId },
      select: { userId: true, revokedAt: true, revokeReason: true, lastSeenAt: true, user: { select: { status: true, role: true, name: true } } },
    });
    if (!s || s.userId !== userId) result = { ok: false, reason: "sessão inexistente" };
    else if (s.revokedAt) result = { ok: false, reason: s.revokeReason ?? "sessão encerrada" };
    else if (s.user.status !== "active") {
      result = { ok: false, reason: "conta suspensa" };
      await db.userSession.update({ where: { id: sessionId }, data: { revokedAt: new Date(), revokeReason: "conta suspensa", revokedBy: "system" } });
    } else if (s.user.role === "teacher") result = { ok: false, reason: "sem acesso" };
    else {
      result = { ok: true, role: s.user.role, name: s.user.name };
      if (Date.now() - s.lastSeenAt.getTime() > SEEN_EVERY_MS) {
        await db.userSession.update({ where: { id: sessionId }, data: { lastSeenAt: new Date() } });
      }
    }
  } catch (err) {
    // Banco fora do ar: não derruba quem já estava logado (o acesso ao conteúdo
    // continua conferido em cada rota).
    console.error("[security] falha ao conferir a sessão:", err);
    return { ok: true, role: "", name: "" }; // papel vazio = mantém o do login
  }
  cache.set(sessionId, { at: Date.now(), result });
  if (cache.size > 5000) cache.clear();
  return result;
}

export async function revokeSession(sessionId: string, reason: string, by: string) {
  await db.userSession.updateMany({ where: { id: sessionId, revokedAt: null }, data: { revokedAt: new Date(), revokeReason: reason, revokedBy: by } });
  cache.delete(sessionId);
}

export async function revokeUserSessions(userId: string, reason: string, by: string, exceptSessionId?: string) {
  const { count } = await db.userSession.updateMany({
    where: { userId, revokedAt: null, ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}) },
    data: { revokedAt: new Date(), revokeReason: reason, revokedBy: by },
  });
  cache.clear();
  return count;
}
