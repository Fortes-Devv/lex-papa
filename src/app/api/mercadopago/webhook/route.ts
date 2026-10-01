import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { getMpOrderClient, isMercadoPagoConfigured } from "@/lib/mercadopago";
import { fulfillFromMpOrder } from "@/lib/order-fulfillment";
import { logAudit } from "@/lib/audit";

// Status HTTP de um erro do SDK do Mercado Pago, quando houver.
function mpErrorStatus(err: unknown): number | undefined {
  if (!err || typeof err !== "object") return undefined;
  const e = err as { status?: unknown; cause?: { status?: unknown } };
  const status = e.status ?? e.cause?.status;
  return typeof status === "number" ? status : undefined;
}

// Verifica a assinatura x-signature do Mercado Pago (HMAC-SHA256).
// https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
function verifySignature(request: Request, dataId: string): boolean {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) return false;

  const signatureHeader = request.headers.get("x-signature");
  const requestId = request.headers.get("x-request-id");
  if (!signatureHeader || !requestId) return false;

  const parts: Record<string, string> = {};
  for (const pair of signatureHeader.split(",")) {
    const [k, v] = pair.split("=");
    if (k && v) parts[k.trim()] = v.trim();
  }
  const { ts, v1 } = parts;
  if (!ts || !v1) return false;

  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
  const expected = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(v1, "hex"));
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const body = (await request.json().catch(() => null)) as { type?: string; topic?: string; data?: { id?: string }; resource?: string } | null;

  const dataId = url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? body?.data?.id;
  const type = url.searchParams.get("type") ?? url.searchParams.get("topic") ?? body?.type ?? body?.topic;

  // Só tratamos notificações de order/payment com id
  if (!dataId) return NextResponse.json({ received: true });

  if (!isMercadoPagoConfigured()) {
    return NextResponse.json({ received: true, warning: "Mercado Pago não configurado." });
  }

  if (!verifySignature(request, String(dataId))) {
    return NextResponse.json({ error: "Assinatura inválida." }, { status: 401 });
  }

  try {
    // Descobre a Order do MP a partir da notificação e concilia.
    let mpOrderId: string | undefined;
    if (type?.includes("order")) {
      mpOrderId = String(dataId);
    } else {
      // Notificação de pagamento: acha nosso pedido pelo mpPaymentId e usa o mpOrderId salvo.
      const local = await db.order.findFirst({ where: { mpPaymentId: String(dataId) } });
      mpOrderId = local?.mpOrderId ?? undefined;
    }
    if (!mpOrderId) return NextResponse.json({ received: true });

    const mpOrder = await getMpOrderClient().get({ id: mpOrderId });
    if (mpOrder.external_reference) {
      await fulfillFromMpOrder(mpOrder.external_reference, mpOrder);
    }
  } catch (err) {
    // Erro 4xx da API do MP (ex.: order inexistente) não melhora com reenvio: confirma.
    // Qualquer outra falha (rede, banco, 5xx) devolve 500 para o MP reenviar
    // a notificação — senão o aluno pode pagar e ficar sem acesso.
    const status = mpErrorStatus(err);
    const permanent = status !== undefined && status >= 400 && status < 500;
    console.error(`[mp-webhook] falha ao processar notificação ${type ?? "?"}:${dataId}${permanent ? " (permanente, ignorada)" : ""}`, err);
    await logAudit({
      action: "payment.webhook_failed",
      resourceType: "order",
      resourceId: String(dataId),
      metadata: { type, permanent, error: err instanceof Error ? err.message : String(err) },
    });
    if (!permanent) {
      return NextResponse.json({ error: "Falha ao processar a notificação." }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
