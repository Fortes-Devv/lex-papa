export const dynamic = "force-dynamic";
import Link from "next/link";
import { CreditCard, PlayCircle, Image as ImageIcon, Mail, Database, BarChart3, MessageCircle, AlertCircle } from "lucide-react";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { isMercadoPagoConfigured } from "@/lib/mercadopago";
import { isBunnyConfigured } from "@/lib/bunny";
import { isEmailConfigured } from "@/lib/email";
import { PageHeader, Pill, ButtonLink } from "@/components/admin/page-kit";
import { ActionButton } from "@/components/admin/action-button";
import { testIntegration, reprocessPendingPayments } from "@/lib/actions/integrations";
import { formatRelativeDate, cn } from "@/lib/utils/cn";

type Status = "ok" | "error" | "off";
const TESTABLE = new Set(["mp", "bunny", "cloudinary", "email", "db"]);
const STATUS_LABEL: Record<Status, string> = { ok: "Conectado", error: "Erro", off: "Não configurado" };

// Integrações (modelo 5h): status real de cada serviço. ?status=conectadas|erro|pendentes, ?categoria=.
export default async function AdminIntegrationsPage(props: { searchParams: Promise<{ status?: string; categoria?: string }> }) {
  const { status, categoria } = await props.searchParams;
  const settings = await getSettings();
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const lastFailure = await db.auditLog.findFirst({ where: { action: "payment.webhook_failed" }, orderBy: { createdAt: "desc" }, select: { createdAt: true } });
  const lastPaid = await db.order.findFirst({ where: { status: "paid" }, orderBy: { paidAt: "desc" }, select: { paidAt: true } });
  const videos = await db.lesson.count({ where: { videoProvider: "bunny", videoPublicId: { not: null } } });
  const recentFailure = lastFailure && lastFailure.createdAt > dayAgo;
  const cloudinaryOk = Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
  const tokenOn = Boolean(process.env.BUNNY_STREAM_TOKEN_KEY);

  const services: { id: string; name: string; desc: string; category: string; icon: React.ReactNode; status: Status; detail: string; href?: string }[] = [
    {
      id: "mp", name: "Gateway de pagamento", desc: "Mercado Pago · Pix, boleto e cartão", category: "pagamentos", icon: <CreditCard className="h-4 w-4" />,
      status: !isMercadoPagoConfigured() ? "off" : recentFailure ? "error" : "ok",
      detail: recentFailure ? `Último erro: webhook · ${formatRelativeDate(lastFailure!.createdAt.toISOString())}` : lastPaid?.paidAt ? `Última venda: ${formatRelativeDate(lastPaid.paidAt.toISOString())}` : "Nenhuma venda ainda",
      href: recentFailure ? "/admin/logs?nivel=erro&origem=pagamentos" : undefined,
    },
    {
      id: "bunny", name: "Hospedagem de vídeo", desc: "Bunny Stream · upload, HLS e player", category: "video", icon: <PlayCircle className="h-4 w-4" />,
      status: isBunnyConfigured() ? "ok" : "off",
      detail: `${videos} vídeo${videos !== 1 ? "s" : ""} · links ${tokenOn ? "protegidos por token" : "SEM token (configure BUNNY_STREAM_TOKEN_KEY)"}`,
    },
    { id: "cloudinary", name: "Imagens e PDFs", desc: "Cloudinary · capas, avatares e materiais", category: "video", icon: <ImageIcon className="h-4 w-4" />, status: cloudinaryOk ? "ok" : "off", detail: cloudinaryOk ? "Uploads ativos" : "Configure CLOUDINARY_*" },
    { id: "email", name: "E-mail transacional", desc: "Resend · redefinição de senha", category: "email", icon: <Mail className="h-4 w-4" />, status: isEmailConfigured() ? "ok" : "off", detail: isEmailConfigured() ? "Envio ativo" : "Configure RESEND_API_KEY e EMAIL_FROM" },
    { id: "db", name: "Banco de dados", desc: "Neon Postgres", category: "infra", icon: <Database className="h-4 w-4" />, status: "ok", detail: "Conectado (esta página carregou do banco)" },
    { id: "ga", name: "Google Analytics", desc: "Visitas e conversões", category: "marketing", icon: <BarChart3 className="h-4 w-4" />, status: settings.integrations.googleAnalyticsId ? "ok" : "off", detail: settings.integrations.googleAnalyticsId || "Sem ID configurado", href: "/admin/settings?secao=integracoes" },
    { id: "wa", name: "WhatsApp", desc: "Botão de suporte", category: "marketing", icon: <MessageCircle className="h-4 w-4" />, status: settings.integrations.whatsappNumber ? "ok" : "off", detail: settings.integrations.whatsappNumber || "Sem número configurado", href: "/admin/settings?secao=integracoes" },
  ];

  const visible = services.filter((s) =>
    (!status || (status === "conectadas" && s.status === "ok") || (status === "erro" && s.status === "error") || (status === "pendentes" && s.status === "off"))
    && (!categoria || s.category === categoria),
  );
  const connected = services.filter((s) => s.status === "ok").length;
  const errors = services.filter((s) => s.status === "error").length;

  return (
    <div>
      <PageHeader title="Integrações" subtitle={`${connected} conectada${connected !== 1 ? "s" : ""}${errors ? ` · ${errors} com erro` : ""}`}
        actions={<ButtonLink href="/admin/settings?secao=integracoes" variant="primary">+ Conectar serviço</ButtonLink>} />

      {recentFailure && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-[14px] border border-danger/30 bg-danger-soft p-4 dark:bg-danger/10">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-danger text-white"><AlertCircle className="h-4 w-4" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] font-bold text-foreground">Webhook de pagamento falhou {formatRelativeDate(lastFailure!.createdAt.toISOString())}</p>
            <p className="text-xs text-foreground-muted">O Mercado Pago reenvia sozinho; se um aluno pagou e não recebeu acesso, confira em Pedidos.</p>
          </div>
          <ButtonLink href="/admin/logs?nivel=erro&origem=pagamentos">Ver log</ButtonLink>
          <ActionButton action={reprocessPendingPayments}>Reprocessar</ActionButton>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:gap-4 xl:grid-cols-3">
        {visible.map((s) => (
          <div key={s.id} className={cn("flex flex-col rounded-[14px] border bg-card p-4", s.status === "error" ? "border-danger/40" : "border-border")}>
            <div className="flex items-start justify-between gap-2">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-navy text-white">{s.icon}</span>
              <Pill tone={s.status === "ok" ? "ok" : s.status === "error" ? "danger" : "gray"}>{STATUS_LABEL[s.status]}</Pill>
            </div>
            <p className="mt-3 text-[15px] font-bold text-foreground">{s.name}</p>
            <p className="text-xs text-foreground-muted">{s.desc}</p>
            <p className="mt-3 flex-1 text-[11.5px] text-foreground-muted">{s.detail}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {s.href ? (
                <Link href={s.href} className="inline-flex h-9 items-center justify-center rounded-lg border border-line-strong text-[13px] font-semibold text-foreground hover:bg-background dark:border-white/10">
                  {s.status === "error" ? "Ver log" : "Configurar"}
                </Link>
              ) : <span />}
              {TESTABLE.has(s.id) && <ActionButton action={testIntegration.bind(null, s.id)} variant="ghost">Testar</ActionButton>}
            </div>
          </div>
        ))}
        {visible.length === 0 && <p className="col-span-full py-12 text-center text-sm text-foreground-muted">Nenhuma integração neste filtro.</p>}
      </div>
    </div>
  );
}
