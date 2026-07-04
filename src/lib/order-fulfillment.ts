import { db } from "@/lib/db";
import type { OrderStatus, PaymentMethod } from "@prisma/client";
import { getMpOrderClient, isMercadoPagoConfigured } from "@/lib/mercadopago";

// Mapeia o status da Order do Mercado Pago para o OrderStatus do nosso schema.
export function mapMpOrderStatus(mpStatus?: string): OrderStatus {
  switch (mpStatus) {
    case "processed":
      return "paid";
    case "cancelled":
    case "expired":
      return "cancelled";
    case "refunded":
      return "refunded";
    case "failed":
      return "failed";
    case "created":
    case "action_required":
    case "at_terminal":
    default:
      return "processing";
  }
}

// MP: payment_method.type = credit_card/debit_card/ticket/bank_transfer; id = visa/pix/bolbradesco...
export function mapMpPaymentMethod(type?: string | null, id?: string | null): PaymentMethod | undefined {
  if (id === "pix" || type === "bank_transfer") return "pix";
  if (type === "ticket") return "boleto";
  if (type === "credit_card") return "credit_card";
  if (type === "debit_card") return "debit_card";
  return undefined;
}

interface MpOrderLike {
  id?: string;
  status?: string;
  status_detail?: string;
  transactions?: { payments?: Array<{ id?: string; status?: string; payment_method?: { id?: string; type?: string } }> };
}

// Atualiza nosso Order a partir da resposta da Order do Mercado Pago e,
// quando pago, cria a matrícula. Idempotente.
export async function fulfillFromMpOrder(ourOrderId: string, mpOrder: MpOrderLike) {
  const order = await db.order.findUnique({ where: { id: ourOrderId }, include: { items: true } });
  if (!order) return;
  if (order.status === "paid") return; // já processado

  const status = mapMpOrderStatus(mpOrder.status);
  const payment = mpOrder.transactions?.payments?.[0];
  const method = mapMpPaymentMethod(payment?.payment_method?.type, payment?.payment_method?.id);

  await db.order.update({
    where: { id: ourOrderId },
    data: {
      status,
      mpOrderId: mpOrder.id ?? order.mpOrderId,
      mpPaymentId: payment?.id ?? order.mpPaymentId,
      mpStatusDetail: mpOrder.status_detail ?? undefined,
      paymentMethod: method ?? order.paymentMethod ?? undefined,
      paidAt: status === "paid" ? new Date() : order.paidAt,
    },
  });

  if (status === "paid") {
    for (const item of order.items) {
      const existing = await db.enrollment.findUnique({
        where: { userId_productId: { userId: order.userId, productId: item.productId } },
      });
      if (!existing) {
        await db.enrollment.create({
          data: { userId: order.userId, productId: item.productId, status: "active", accessType: "lifetime", orderId: order.id },
        });
        await db.product.update({ where: { id: item.productId }, data: { enrolledCount: { increment: 1 } } });
      }
    }
    if (order.couponCode) {
      await db.coupon.update({ where: { code: order.couponCode }, data: { usedCount: { increment: 1 } } }).catch(() => {});
    }
  }

  return status;
}

// Re-consulta no Mercado Pago os pedidos ainda pendentes/processando (com mpOrderId)
// e atualiza o status local (pago/expirado/cancelado). Sequencial de propósito
// (driver Neon) e limitado, para rodar ao abrir a tela de pedidos sem custo alto.
export async function reconcilePendingOrders(limit = 15) {
  if (!isMercadoPagoConfigured()) return;

  // Só reconcilia pedidos com mais de 1 minuto (evita corrida com o polling do checkout).
  const cutoff = new Date(Date.now() - 60 * 1000);
  const pending = await db.order.findMany({
    where: {
      status: { in: ["pending", "processing"] },
      mpOrderId: { not: null },
      createdAt: { lt: cutoff },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, mpOrderId: true },
  });

  const client = getMpOrderClient();
  for (const o of pending) {
    try {
      const mpOrder = await client.get({ id: o.mpOrderId! });
      await fulfillFromMpOrder(o.id, mpOrder);
    } catch {
      // ignora falhas pontuais de consulta
    }
  }
}
