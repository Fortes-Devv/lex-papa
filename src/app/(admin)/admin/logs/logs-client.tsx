"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Copy } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { PageHeader, Pill, tableHeadClass } from "@/components/admin/page-kit";
import { ActionButton } from "@/components/admin/action-button";
import { reprocessWebhookEvent } from "@/lib/actions/integrations";
import { cn } from "@/lib/utils/cn";
import { ORIGIN_LABEL, type LogLevel, type LogOrigin } from "./log-meta";

export interface LogRow {
  id: string;
  actorName: string;
  actorEmail: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  metadata: string | null;
  ipAddress: string | null;
  createdAt: string;
  level: LogLevel;
  origin: LogOrigin;
}

const LEVEL: Record<LogLevel, { label: string; tone: "danger" | "brand" | "gray" }> = {
  erro: { label: "ERRO", tone: "danger" }, aviso: { label: "AVISO", tone: "brand" }, info: { label: "INFO", tone: "gray" },
};

// Mensagem legível a partir da ação + metadados.
function message(l: LogRow) {
  const meta = l.metadata ? (JSON.parse(l.metadata) as Record<string, unknown>) : {};
  const extra = ["title", "email", "role", "status", "error", "path"].map((k) => meta[k]).filter((v) => typeof v === "string" && v).slice(0, 2) as string[];
  return [l.action, l.actorName !== "Sistema" ? l.actorName : null, ...extra].filter(Boolean).join(" · ");
}

const time = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "America/Fortaleza" });
const day = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Fortaleza" });

export function LogsClient({ logs }: { logs: LogRow[] }) {
  const router = useRouter();
  const { success } = useToast();
  const [open, setOpen] = useState<string | null>(null);
  const [live, setLive] = useState(true);

  // "Ao vivo": recarrega a lista a cada 30 s (só com a aba visível).
  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => { if (document.visibilityState === "visible") router.refresh(); }, 30_000);
    return () => clearInterval(t);
  }, [live, router]);

  function copy(l: LogRow) {
    navigator.clipboard.writeText(JSON.stringify({ ...l, metadata: l.metadata ? JSON.parse(l.metadata) : null }, null, 2));
    success("Registro copiado.");
  }

  return (
    <div>
      <PageHeader
        title="Logs"
        subtitle={`${logs.length} registro${logs.length !== 1 ? "s" : ""} · ${live ? "atualiza a cada 30 s" : "atualização pausada"}`}
        actions={
          <>
          <a href="/api/admin/export?tipo=logs" download className="inline-flex h-9 items-center rounded-lg border border-line-strong bg-card px-3.5 text-[13px] font-semibold text-foreground dark:border-white/10">Exportar</a>
          <button type="button" onClick={() => setLive((v) => !v)} className="inline-flex h-9 items-center gap-2 rounded-lg border border-line-strong bg-card px-3 text-[13px] font-semibold text-foreground dark:border-white/10">
            <span className={cn("h-2 w-2 rounded-full", live ? "bg-ok" : "bg-line-strong")} /> {live ? "Ao vivo" : "Pausado"}
          </button>
          </>
        }
      />

      <div className="overflow-hidden rounded-[14px] border border-border bg-card">
        <div className={cn("hidden grid-cols-[90px_80px_110px_minmax(0,1fr)_24px] gap-3 border-b border-line-soft bg-[#faf8f5] px-[18px] py-2.5 md:grid dark:border-white/10 dark:bg-white/5", tableHeadClass)}>
          <span>Hora</span><span>Nível</span><span>Origem</span><span>Mensagem</span><span />
        </div>
        {logs.map((l) => {
          const expanded = open === l.id;
          return (
            <div key={l.id} className={cn("border-b border-line-soft last:border-0 dark:border-white/10", l.level === "erro" && "bg-danger-soft/50 dark:bg-danger/5")}>
              <button type="button" onClick={() => setOpen(expanded ? null : l.id)} aria-expanded={expanded}
                className="grid w-full grid-cols-[64px_minmax(0,1fr)_20px] items-center gap-3 px-[18px] py-2.5 text-left font-mono text-[12px] md:grid-cols-[90px_80px_110px_minmax(0,1fr)_24px]">
                <span className="text-foreground-muted" title={day(l.createdAt)}>{time(l.createdAt)}</span>
                <span className="hidden md:block"><Pill tone={LEVEL[l.level].tone} className="font-sans">{LEVEL[l.level].label}</Pill></span>
                <span className="hidden text-foreground md:block">{ORIGIN_LABEL[l.origin]}</span>
                <span className="min-w-0 truncate text-foreground">
                  <span className={cn("mr-1.5 md:hidden", l.level === "erro" ? "text-danger" : l.level === "aviso" ? "text-brand" : "text-foreground-muted")}>{LEVEL[l.level].label}</span>
                  {message(l)}
                </span>
                <ChevronDown className={cn("h-4 w-4 text-foreground-muted transition-transform", expanded && "rotate-180")} />
              </button>
              {expanded && (
                <div className="px-[18px] pb-3 md:pl-[300px]">
                  <pre className="overflow-x-auto rounded-lg border border-border bg-card p-3 font-mono text-[11.5px] leading-relaxed text-foreground">
{`${l.action}  ·  ${l.resourceType}${l.resourceId ? ` ${l.resourceId}` : ""}
por ${l.actorName}${l.actorEmail ? ` <${l.actorEmail}>` : ""}${l.ipAddress ? `  ·  IP ${l.ipAddress}` : ""}
${day(l.createdAt)} ${time(l.createdAt)}${l.metadata && l.metadata !== "{}" ? `\n${l.metadata}` : ""}`}
                  </pre>
                  <button type="button" onClick={() => copy(l)} className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-lg border border-line-strong bg-card px-3 text-xs font-semibold text-foreground dark:border-white/10">
                    <Copy className="h-3.5 w-3.5" /> Copiar JSON
                  </button>
                  {l.resourceType === "order" && l.resourceId && (
                    <Link href={`/admin/orders?q=${encodeURIComponent(l.resourceId)}`} className="ml-2 mt-2 inline-flex h-8 items-center rounded-lg border border-line-strong bg-card px-3 text-xs font-semibold text-foreground dark:border-white/10">Ver pedido</Link>
                  )}
                  {l.action === "payment.webhook_failed" && (
                    <span className="ml-2 inline-block"><ActionButton action={reprocessWebhookEvent.bind(null, l.id)}>Reprocessar evento</ActionButton></span>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {logs.length === 0 && <p className="py-12 text-center text-sm text-foreground-muted">Nenhum registro neste filtro.</p>}
      </div>
    </div>
  );
}
