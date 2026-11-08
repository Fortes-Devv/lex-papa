import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { computeOrderTotal } from "@/lib/pricing";
import { getMpOrderClient, isMercadoPagoConfigured } from "@/lib/mercadopago";
import { fulfillFreeOrder, fulfillFromMpOrder } from "@/lib/order-fulfillment";
import { isEnrollmentActive } from "@/lib/access";
import { cardPrice } from "@/lib/card-fee";
import { cardRejectMessage, mpErrorDetail, mpStatusDetailOf } from "@/lib/mp-reject";

const cpf = z.string().transform((v) => v.replace(/\D/g, "")).refine((v) => v.length === 11, "CPF deve ter 11 dígitos.");
const basePayer = {
  email: z.string().trim().email("E-mail inválido."),
  identificationType: z.literal("CPF"),
  identificationNumber: cpf,
};
const namedPayer = z.object({
  ...basePayer,
  firstName: z.string().trim().min(1, "Informe o nome.").max(100),
  lastName: z.string().trim().max(100).optional(),
});
const common = {
  productId: z.string().min(1).max(64),
  couponCode: z.string().trim().max(64).nullish(),
  // ID do aparelho (security.js do MP). O antifraude recusa muito mais sem ele.
  deviceId: z.string().trim().max(200).nullish(),
};
// Telefone só com dígitos, DDD + número (10 ou 11 dígitos); inválido vira undefined.
const phone = z.string().transform((v) => v.replace(/\D/g, "")).refine((v) => v.length === 10 || v.length === 11).optional().catch(undefined);

const payloadSchema = z.discriminatedUnion("method", [
  z.object({
    ...common,
    method: z.literal("card"),
    token: z.string().min(1).max(200),
    installments: z.number().int().min(1, "Parcelas inválidas.").max(12, "Máximo de 12 parcelas."),
    paymentMethodId: z.string().regex(/^[a-z_]{2,30}$/, "Bandeira inválida."), // ex: "visa", "master"
    payer: z.object({
      ...basePayer,
      firstName: z.string().trim().max(100).optional(),
      lastName: z.string().trim().max(100).optional(),
      phone,
    }),
  }),
  z.object({ ...common, method: z.literal("pix"), payer: namedPayer }),
  z.object({ ...common, method: z.literal("boleto"), payer: namedPayer }),
  z.object({ ...common, method: z.literal("free") }), // total R$ 0 (cupom de 100%)
]);

// Mensagem amigável para falhas do Mercado Pago (o erro cru vai só para o log).
function friendlyMpError(err: unknown): string {
  const text = (err instanceof Error ? err.message : JSON.stringify(err ?? "")).toLowerCase();
  if (text.includes("identification") || text.includes("cpf")) return "CPF inválido. Confira o número e tente novamente.";
  if (text.includes("card_token") || text.includes("token")) return "Os dados do cartão expiraram. Preencha o cartão de novo.";
  if (text.includes("installments")) return "Número de parcelas indisponível para este cartão.";
  if (text.includes("email")) return "E-mail do pagador inválido.";
  return "Não foi possível processar o pagamento agora. Tente novamente ou use outra forma de pagamento.";
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Faça login para continuar." }, { status: 401 });

  const parsed = payloadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Requisição inválida." }, { status: 400 });
  }
  const body = parsed.data;

  let priced;
  try {
    priced = await computeOrderTotal(body.productId, body.couponCode);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erro ao calcular preço." }, { status: 400 });
  }

  const already = await db.enrollment.findUnique({
    where: { userId_productId: { userId: session.user.id, productId: body.productId } },
  });
  // Só bloqueia quem tem acesso válido: expirada/cancelada (reembolso) pode recomprar (a matrícula é reativada).
  if (isEnrollmentActive(already)) return NextResponse.json({ error: "Você já tem acesso a este curso." }, { status: 400 });

  // Cupom de 100% (total R$ 0): pedido pago e matrícula na hora, sem Mercado Pago.
  if (priced.total === 0) {
    const freeOrder = await db.order.create({
      data: {
        userId: session.user.id,
        subtotal: priced.subtotal,
        discount: priced.discount,
        total: 0,
        status: "pending",
        couponCode: priced.coupon?.code,
        items: { create: [{ productId: body.productId, quantity: 1, unitPrice: priced.subtotal, totalPrice: priced.subtotal, discount: priced.discount }] },
      },
    });
    await fulfillFreeOrder(freeOrder.id);
    return NextResponse.json({ orderId: freeOrder.id, status: "processed", free: true });
  }

  if (body.method === "free") {
    return NextResponse.json({ error: "Este pedido não é gratuito." }, { status: 400 });
  }
  if (!isMercadoPagoConfigured()) {
    return NextResponse.json({ error: "Mercado Pago não configurado." }, { status: 500 });
  }

  // No cartão, o valor embute a tarifa do MP (a escola recebe o preço cheio).
  const charged = body.method === "card" ? cardPrice(priced.total) : priced.total;

  // Cria o pedido local (pending)
  const order = await db.order.create({
    data: {
      userId: session.user.id,
      subtotal: priced.subtotal,
      discount: priced.discount,
      total: charged,
      status: "pending",
      couponCode: priced.coupon?.code,
      items: { create: [{ productId: body.productId, quantity: 1, unitPrice: priced.subtotal, totalPrice: priced.subtotal, discount: priced.discount }] },
    },
  });

  const amount = charged.toFixed(2);

  // Monta o payment da Order conforme o método
  let paymentMethod: Record<string, unknown>;
  let payerEmail: string;
  let payerExtra: Record<string, unknown> = {};

  if (body.method === "card") {
    paymentMethod = { id: body.paymentMethodId, type: "credit_card", token: body.token, installments: body.installments };
    payerEmail = body.payer.email;
    payerExtra = {
      ...(body.payer.firstName ? { first_name: body.payer.firstName, last_name: body.payer.lastName ?? "" } : {}),
      ...(body.payer.phone ? { phone: { area_code: body.payer.phone.slice(0, 2), number: body.payer.phone.slice(2) } } : {}),
      identification: { type: body.payer.identificationType, number: body.payer.identificationNumber },
    };
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
        // Item vendido: o antifraude do MP pontua melhor pedidos com itens descritos.
        items: [{ title: priced.product.title, unit_price: amount, quantity: 1, external_code: body.productId }],
        transactions: { payments: [paymentEntry as never] },
      },
      requestOptions: { idempotencyKey: order.id, ...(body.deviceId ? { meliSessionId: body.deviceId } : {}) },
    });

    await fulfillFromMpOrder(order.id, mpOrder);

    const payment = mpOrder.transactions?.payments?.[0];
    const pm = payment?.payment_method as { qr_code?: string; qr_code_base64?: string; ticket_url?: string; digitable_line?: string } | undefined;

    const detail = mpStatusDetailOf(mpOrder);
    if (body.method === "card" && ["failed", "cancelled"].includes(mpOrder.status ?? "")) {
      console.warn(`[checkout] cartão recusado (pedido ${order.id}): ${detail}`);
    }

    return NextResponse.json({
      orderId: order.id,
      status: mpOrder.status,
      statusDetail: detail,
      rejectMessage: body.method === "card" ? cardRejectMessage(detail) : undefined,
      // Dados para exibir PIX/boleto na tela
      pix: pm?.qr_code ? { qrCode: pm.qr_code, qrCodeBase64: pm.qr_code_base64 } : null,
      boleto: pm?.ticket_url ? { url: pm.ticket_url, digitableLine: pm.digitable_line } : null,
    });
  } catch (err) {
    const detail = mpErrorDetail(err);
    // Guarda o motivo (aparece em Pedidos > detalhes) — antes ia só para o log.
    await db.order.update({ where: { id: order.id }, data: { status: "failed", mpStatusDetail: detail } });
    console.error(`[checkout] falha no Mercado Pago (pedido ${order.id}): ${detail}`, err);
    // Recusa de cartão (o MP responde erro com o pagamento recusado): mensagem conforme o motivo.
    const isCardReject = body.method === "card" && /rejected|high_risk|insufficient|call_for_auth|bad_filled|disabled|max_attempts|by_issuer|failed/i.test(detail);
    return NextResponse.json({ error: isCardReject ? cardRejectMessage(detail) : friendlyMpError(err) }, { status: 502 });
  }
}
