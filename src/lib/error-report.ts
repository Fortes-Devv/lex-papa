import { db } from "@/lib/db";
import { hitRateLimit } from "@/lib/rate-limit";

// Hash curto (FNV-1a) só para agrupar erros iguais; JS puro, roda em qualquer runtime.
function fingerprintOf(text: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  return (h >>> 0).toString(16);
}

// Monitoramento simples: erros de produção viram registros nos Logs do admin
// (nível "erro", origem "sistema"). O mesmo erro é gravado no máximo 1x a cada 10 min.
export async function reportError(input: { kind: "server" | "client"; message: string; path?: string; digest?: string; extra?: Record<string, unknown> }) {
  try {
    const message = input.message.slice(0, 500) || "Erro sem mensagem";
    const path = input.path?.slice(0, 300);
    const fingerprint = fingerprintOf(`${input.kind}|${message}|${path ?? ""}`);
    if (!(await hitRateLimit(`err:${fingerprint}`, 1, 600)).allowed) return;
    await db.auditLog.create({
      data: {
        action: input.kind === "server" ? "system.server_error" : "system.client_error",
        resourceType: "system",
        resourceId: input.digest?.slice(0, 64) ?? fingerprint,
        metadata: { error: message, path, ...input.extra } as never,
      },
    });
  } catch {
    // monitoramento nunca pode derrubar a requisição
  }
}
