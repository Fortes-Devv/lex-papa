export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { LogsClient, type LogRow } from "./logs-client";
import { logLevel, logOrigin } from "./log-meta";

// Logs (modelo 5i): ?nivel=erro|aviso|info, ?origem=pagamentos|conteudo|usuarios|sistema, ?q=.
export default async function AdminLogsPage(props: { searchParams: Promise<{ nivel?: string; origem?: string; q?: string }> }) {
  const { nivel, origem, q } = await props.searchParams;
  const logs = await db.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
    include: { actor: { select: { name: true, email: true } } },
  });

  const term = q?.trim().toLowerCase();
  const rows: LogRow[] = logs
    .map((l) => ({
      id: l.id,
      actorName: l.actor?.name ?? "Sistema",
      actorEmail: l.actor?.email ?? null,
      action: l.action,
      resourceType: l.resourceType,
      resourceId: l.resourceId,
      metadata: l.metadata ? JSON.stringify(l.metadata, null, 2) : null,
      ipAddress: l.ipAddress,
      createdAt: l.createdAt.toISOString(),
      level: logLevel(l.action),
      origin: logOrigin(l.action, l.resourceType),
    }))
    .filter((r) => (!nivel || r.level === nivel) && (!origem || r.origin === origem))
    .filter((r) => !term || [r.action, r.actorName, r.actorEmail ?? "", r.resourceId ?? "", r.metadata ?? ""].some((v) => v.toLowerCase().includes(term)));

  return <LogsClient logs={rows} />;
}
