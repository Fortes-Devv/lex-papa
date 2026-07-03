import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { computeOrderTotal } from "@/lib/pricing";
import { getMpPaymentClient, isMercadoPagoConfigured } from "@/lib/mercadopago";
import { fulfillOrder, mapMpPaymentMethod } from "@/lib/order-fulfillment";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Faça login para continuar." }, { status: 401 });
  }

  if (!isMercadoPagoConfigured()) {
    return NextResponse.json(
      { error: "Mercado Pago não configurado. Preencha MERCADOPAGO_ACCESS_TOKEN no .env." },
      { status: 500 }
    );
  }

  const body = await request.json().catch(() => null);
  if (!body?.productId || !body?.formData) {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const { productId, couponCode, formData } = body as {
    productId: string;
    couponCode?: string;
    formData: Record<string, unknown>;
  };

  let priced;
  try {
    priced = await computeOrderTotal(productId, couponCode);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erro ao calcular preço." }, { status: 400 });
  }

  const existingEnrollment = await db.enrollment.findUnique({
    where: { userId_productId: { userId: session.user.id, productId } },
  });
  if (existingEnrollment) {
    return NextResponse.json({ error: "Você já tem acesso a este curso." }, { status: 400 });
  }

  const order = await db.order.create({
    data: {
      userId: session.user.id,
      subtotal: priced.subtotal,
      discount: priced.discount,
      total: priced.total,
      status: "pending",
      couponCode: priced.coupon?.code,
      items: {
        create: [{
          productId,
          quantity: 1,
          unitPrice: priced.subtotal,
          totalPrice: priced.subtotal,
          discount: priced.discount,
        }],
      },
    },
  });

  const origin = new URL(request.url).origin;

  try {
    const payment = await getMpPaymentClient().create({
      body: {
        ...formData,
        transaction_amount: priced.total,
        description: priced.product.title,
        external_reference: order.id,
        notification_url: `${origin}/api/mercadopago/webhook`,
      },
      requestOptions: { idempotencyKey: order.id },
    });

    const status = payment.status ?? "pending";
    await fulfillOrder(order.id, {
      paymentId: String(payment.id),
      status,
      statusDetail: payment.status_detail,
      paymentMethod: mapMpPaymentMethod(payment.payment_type_id, payment.payment_method_id),
    });

    return NextResponse.json({
      orderId: order.id,
      status,
      statusDetail: payment.status_detail,
      paymentId: payment.id,
      // Dados extras para PIX (QR code) e boleto (link), quando existirem.
      pointOfInteraction: payment.point_of_interaction ?? null,
    });
  } catch (err) {
    await db.order.update({ where: { id: order.id }, data: { status: "failed" } });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao processar pagamento no Mercado Pago." },
      { status: 502 }
    );
  }
}
