import { NextResponse } from "next/server";
import crypto from "crypto";
import { getMpPaymentClient, isMercadoPagoConfigured } from "@/lib/mercadopago";
import { fulfillOrder, mapMpPaymentMethod } from "@/lib/order-fulfillment";

// Verifica o header x-signature conforme o algoritmo do Mercado Pago:
// manifest = "id:{data.id};request-id:{x-request-id};ts:{ts};" assinado com HMAC-SHA256.
// https://www.mercadopago.com.br/developers/pt/docs/checkout-api/webhooks
function verifySignature(request: Request, dataId: string): boolean {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) return false;

  const signatureHeader = request.headers.get("x-signature");
  const requestId = request.headers.get("x-request-id");
  if (!signatureHeader || !requestId) return false;

  const parts: Record<string, string> = {};
  for (const pair of signatureHeader.split(",")) {
    const [key, value] = pair.split("=");
    if (key && value) parts[key.trim()] = value.trim();
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
  const queryDataId = url.searchParams.get("data.id") ?? url.searchParams.get("id");
  const queryType = url.searchParams.get("type");

  const body = await request.json().catch(() => null) as { type?: string; data?: { id?: string } } | null;

  const resolvedId = queryDataId ?? body?.data?.id;
  const resolvedType = queryType ?? body?.type;

  if (!resolvedId || resolvedType !== "payment") {
    return NextResponse.json({ received: true });
  }

  if (!isMercadoPagoConfigured()) {
    return NextResponse.json({ received: true, warning: "Mercado Pago não configurado neste ambiente." });
  }

  if (!verifySignature(request, String(resolvedId))) {
    return NextResponse.json({ error: "Assinatura inválida." }, { status: 401 });
  }

  const payment = await getMpPaymentClient().get({ id: resolvedId });
  const orderId = payment.external_reference;
  if (!orderId) {
    return NextResponse.json({ received: true });
  }

  await fulfillOrder(orderId, {
    paymentId: String(payment.id),
    status: payment.status ?? "pending",
    statusDetail: payment.status_detail,
    paymentMethod: mapMpPaymentMethod(payment.payment_type_id, payment.payment_method_id),
  });

  return NextResponse.json({ received: true });
}
