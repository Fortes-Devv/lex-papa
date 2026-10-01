import { headers } from "next/headers";
import { db } from "@/lib/db";

// Limite de tentativas guardado no próprio Postgres (sem serviço extra).
// Janela deslizante: conta as tentativas da chave nos últimos `windowSec` segundos.
// Se o banco falhar, não bloqueia o usuário (fail-open) — o limite é proteção extra.
export async function hitRateLimit(key: string, limit: number, windowSec: number): Promise<{ allowed: boolean }> {
  try {
    const since = new Date(Date.now() - windowSec * 1000);
    const count = await db.rateLimitHit.count({ where: { key, createdAt: { gte: since } } });
    if (count >= limit) return { allowed: false };
    await db.rateLimitHit.create({ data: { key } });
    // Limpeza ocasional das tentativas antigas (> 1 dia).
    if (Math.random() < 0.02) {
      await db.rateLimitHit.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } });
    }
    return { allowed: true };
  } catch (err) {
    console.error("[rate-limit] falha, liberando a requisição:", err);
    return { allowed: true };
  }
}

// IP do cliente (na Vercel, o primeiro valor de x-forwarded-for é o IP real).
export function clientIpFrom(h: Headers): string {
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

export async function clientIp(): Promise<string> {
  return clientIpFrom(await headers());
}

export const normalizeEmail = (email: string) => email.trim().toLowerCase();
