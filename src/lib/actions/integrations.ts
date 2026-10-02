"use server";

import { requireModerator } from "@/lib/auth-guards";
import { db } from "@/lib/db";
import { cloudinary } from "@/lib/cloudinary";
import { getBunnyStorageBytes, isBunnyConfigured } from "@/lib/bunny";
import { isEmailConfigured, sendEmail } from "@/lib/email";
import { reconcilePendingOrders, fulfillFromMpOrder } from "@/lib/order-fulfillment";
import { getMpOrderClient } from "@/lib/mercadopago";
import { logAudit } from "@/lib/audit";

type Test = { success: true; message: string } | { success: false; error: string };

// "Testar": faz uma chamada real ao serviço e diz se respondeu.
export async function testIntegration(id: string): Promise<Test> {
  const session = await requireModerator();
  try {
    switch (id) {
      case "mp": {
        const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
        if (!token) return { success: false, error: "MERCADOPAGO_ACCESS_TOKEN não configurado." };
        const res = await fetch("https://api.mercadopago.com/v1/payment_methods", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
        return res.ok ? { success: true, message: "Mercado Pago respondeu: credenciais válidas." } : { success: false, error: `Mercado Pago recusou (HTTP ${res.status}). Confira o access token.` };
      }
      case "bunny": {
        if (!isBunnyConfigured()) return { success: false, error: "BUNNY_STREAM_* não configurado." };
        const bytes = await getBunnyStorageBytes();
        return bytes === null ? { success: false, error: "Bunny não respondeu. Confira a API key e o Library ID." } : { success: true, message: `Bunny respondeu: ${(bytes / 1024 ** 3).toFixed(1)} GB usados.` };
      }
      case "cloudinary": {
        await cloudinary.api.ping();
        return { success: true, message: "Cloudinary respondeu." };
      }
      case "email": {
        if (!isEmailConfigured()) return { success: false, error: "RESEND_API_KEY / EMAIL_FROM não configurados." };
        const to = session.user.email;
        if (!to) return { success: false, error: "Sua conta não tem e-mail." };
        const r = await sendEmail({ to, subject: "Teste de e-mail — LEX Concursos", html: "<p>Se você recebeu esta mensagem, o envio de e-mails da plataforma está funcionando.</p>" });
        return "sent" in r && r.sent === false ? { success: false, error: r.reason } : { success: true, message: `E-mail de teste enviado para ${to}.` };
      }
      case "db": {
        await db.$queryRaw`SELECT 1`;
        return { success: true, message: "Banco respondeu." };
      }
      default:
        return { success: false, error: "Este serviço não tem teste automático." };
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Falha no teste." };
  }
}

// "Reprocessar": consulta no Mercado Pago os pedidos pendentes e libera os que já foram pagos.
export async function reprocessPendingPayments() {
  const session = await requireModerator();
  const before = await db.order.count({ where: { status: { in: ["pending", "processing"] } } });
  await reconcilePendingOrders(50);
  const after = await db.order.count({ where: { status: { in: ["pending", "processing"] } } });
  await logAudit({ actorId: session.user.id, action: "payment.reprocessed", resourceType: "order", metadata: { before, after } });
  return { success: true as const, message: before === after ? "Nenhum pedido mudou de status." : `${before - after} pedido(s) atualizados.` };
}

// "Reprocessar evento" nos Logs: repete uma notificação do webhook que falhou.
export async function reprocessWebhookEvent(logId: string) {
  const session = await requireModerator();
  const log = await db.auditLog.findUnique({ where: { id: logId }, select: { action: true, resourceId: true, metadata: true } });
  if (!log || log.action !== "payment.webhook_failed" || !log.resourceId) return { success: false as const, error: "Evento não encontrado." };
  const type = (log.metadata as { type?: string } | null)?.type ?? "";
  try {
    const mpOrderId = type.includes("order")
      ? log.resourceId
      : (await db.order.findFirst({ where: { mpPaymentId: log.resourceId }, select: { mpOrderId: true } }))?.mpOrderId;
    if (!mpOrderId) return { success: false as const, error: "Pedido do Mercado Pago não encontrado." };
    const mpOrder = await getMpOrderClient().get({ id: mpOrderId });
    if (!mpOrder.external_reference) return { success: false as const, error: "Pedido sem referência local." };
    const status = await fulfillFromMpOrder(mpOrder.external_reference, mpOrder);
    await logAudit({ actorId: session.user.id, action: "payment.reprocessed", resourceType: "order", resourceId: mpOrder.external_reference, metadata: { logId, status } });
    return { success: true as const, message: `Evento reprocessado: pedido ${status === "paid" ? "pago, acesso liberado" : status ?? "atualizado"}.` };
  } catch (err) {
    return { success: false as const, error: err instanceof Error ? err.message : "Falha ao reprocessar." };
  }
}
