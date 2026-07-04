import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { computeOrderTotal } from "@/lib/pricing";
import { getMpOrderClient, isMercadoPagoConfigured } from "@/lib/mercadopago";
import { fulfillFromMpOrder } from "@/lib/order-fulfillment";

interface CardPayload {
  method: "card";
  token: string;
  installments: number;
  paymentMethodId: string; // ex: "visa", "master"
  payer: { email: string; identificationType: string; identificationNumber: string };
}
interface PixPayload {
  method: "pix";
  payer: { email: string; firstName: string; lastName?: string; identificationType: string; identificationNumber: string };
}
interface BoletoPayload {
  method: "boleto";
  payer: { email: string; firstName: string; lastName?: string; identificationType: string; identificationNumber: string };
}
type Payload = { productId: string; couponCode?: string } & (CardPayload | PixPayload | BoletoPayload);

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Faça login para continuar." }, { status: 401 });

  if (!isMercadoPagoConfigured()) {
    return NextResponse.json({ error: "Mercado Pago não configurado." }, { status: 500 });
  }

  const body = (await request.json().catch(() => null)) as Payload | null;
  if (!body?.productId || !body?.method) {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  let priced;
  try {
    priced = await computeOrderTotal(body.productId, body.couponCode);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erro ao calcular preço." }, { status: 400 });
  }

  const already = await db.enrollment.findUnique({
    where: { userId_productId: { userId: session.user.id, productId: body.productId } },
  });
  if (already) return NextResponse.json({ error: "Você já tem acesso a este curso." }, { status: 400 });

  // Cria o pedido local (pending)
  const order = await db.order.create({
    data: {
      userId: session.user.id,
      subtotal: priced.subtotal,
      discount: priced.discount,
      total: priced.total,
      status: "pending",
      couponCode: priced.coupon?.code,
      items: { create: [{ productId: body.productId, quantity: 1, unitPrice: priced.subtotal, totalPrice: priced.subtotal, discount: priced.discount }] },
    },
  });

  const amount = priced.total.toFixed(2);

  // Monta o payment da Order conforme o método
  let paymentMethod: Record<string, unknown>;
  let payerEmail: string;
  let payerExtra: Record<string, unknown> = {};

  if (body.method === "card") {
    paymentMethod = { id: body.paymentMethodId, type: "credit_card", token: body.token, installments: body.installments };
    payerEmail = body.payer.email;
    payerExtra = { identification: { type: body.payer.identificationType, number: body.payer.identificationNumber } };
  } else if (body.method === "pix") {
    paymentMethod = { id: "pix", type: "bank_transfer" };
    payerEmail = body.payer.email;
    payerExtra = {
      first_name: body.payer.firstName,
      last_name: body.payer.lastName ?? "",
      identification: { type: body.payer.identificationType, number: body.payer.identificationNumber },
    };
  } else {
    paymentMethod = { id: "bolbradesco", type: "ticket" };
    payerEmail = body.payer.email;
    payerExtra = {
      first_name: body.payer.firstName,
      last_name: body.payer.lastName ?? "",
      identification: { type: body.payer.identificationType, number: body.payer.identificationNumber },
    };
  }

  // Validade do pagamento: PIX expira em 30min, boleto em 3 dias (cartão é instantâneo).
  // Precisa ir no nível do payment (não da order) para valer para PIX/boleto.
  const expiration = body.method === "pix" ? "PT30M" : body.method === "boleto" ? "P3D" : undefined;
  const paymentEntry: Record<string, unknown> = { amount, payment_method: paymentMethod };
  if (expiration) paymentEntry.expiration_time = expiration;

  try {
    const mpOrder = await getMpOrderClient().create({
      body: {
        type: "online",
        total_amount: amount,
        external_reference: order.id,
        description: priced.product.title,
        processing_mode: "automatic",
        payer: { email: payerEmail, ...payerExtra },
        transactions: { payments: [paymentEntry as never] },
      },
      requestOptions: { idempotencyKey: order.id },
    });

    await fulfillFromMpOrder(order.id, mpOrder);

    const payment = mpOrder.transactions?.payments?.[0];
    const pm = payment?.payment_method as { qr_code?: string; qr_code_base64?: string; ticket_url?: string; digitable_line?: string } | undefined;

    return NextResponse.json({
      orderId: order.id,
      status: mpOrder.status,
      statusDetail: mpOrder.status_detail,
      // Dados para exibir PIX/boleto na tela
      pix: pm?.qr_code ? { qrCode: pm.qr_code, qrCodeBase64: pm.qr_code_base64 } : null,
      boleto: pm?.ticket_url ? { url: pm.ticket_url, digitableLine: pm.digitable_line } : null,
    });
  } catch (err) {
    await db.order.update({ where: { id: order.id }, data: { status: "failed" } });
    const msg = err instanceof Error ? err.message : "Erro ao processar pagamento.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
