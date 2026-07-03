import { db } from "@/lib/db";

// Registra uma ação administrativa no log de auditoria. Nunca lança erro
// (auditoria não deve quebrar a operação principal).
export async function logAudit(input: {
  actorId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}) {
  try {
    await db.auditLog.create({
      data: {
        actorId: input.actorId,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        metadata: input.metadata as never,
        ipAddress: input.ipAddress,
      },
    });
  } catch {
    // silencioso de propósito
  }
}
