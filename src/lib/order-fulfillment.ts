import { db } from "@/lib/db";
import type { OrderStatus, PaymentMethod, Prisma } from "@prisma/client";
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
// quando pago, cria a matrícula. Idempotente e seguro contra corrida:
// webhook, polling do checkout, /success e reconcilePendingOrders podem
// chamar ao mesmo tempo para o mesmo pedido.
export async function fulfillFromMpOrder(ourOrderId: string, mpOrder: MpOrderLike) {
  const order = await db.order.findUnique({ where: { id: ourOrderId }, include: { items: true } });
  if (!order) return;
  if (order.status === "paid") return "paid" as const; // já processado

  const status = mapMpOrderStatus(mpOrder.status);
  const payment = mpOrder.transactions?.payments?.[0];
  const method = mapMpPaymentMethod(payment?.payment_method?.type, payment?.payment_method?.id);

  const data = {
    status,
    mpOrderId: mpOrder.id ?? order.mpOrderId,
    mpPaymentId: payment?.id ?? order.mpPaymentId,
    mpStatusDetail: mpOrder.status_detail ?? undefined,
    paymentMethod: method ?? order.paymentMethod ?? undefined,
    paidAt: status === "paid" ? new Date() : order.paidAt,
  };
  // Nunca sobrescreve um pedido que outra chamada já marcou como pago.
  const notPaid = { id: ourOrderId, status: { not: "paid" as const } };

  if (status !== "paid") {
    await db.order.updateMany({ where: notPaid, data });
    return status;
  }

  await markPaidAndEnroll(order, data);
  return status;
}

// Pedido de valor zero (cupom de 100%): não passa pelo Mercado Pago.
export async function fulfillFreeOrder(ourOrderId: string) {
  const order = await db.order.findUnique({ where: { id: ourOrderId }, include: { items: true } });
  if (!order || order.status === "paid") return;
  if (Number(order.total) !== 0) throw new Error("Pedido não é gratuito.");
  await markPaidAndEnroll(order, { status: "paid", paidAt: new Date() });
}

// Liberação manual pelo admin (ex.: pagamento confirmado fora do Mercado Pago).
export async function fulfillManualOrder(ourOrderId: string) {
  const order = await db.order.findUnique({ where: { id: ourOrderId }, include: { items: true } });
  if (!order) throw new Error("Pedido não encontrado.");
  if (order.status === "paid") return;
  await markPaidAndEnroll(order, { status: "paid", paidAt: new Date(), mpStatusDetail: "liberado manualmente" });
}

type OrderWithItems = { id: string; userId: string; couponCode: string | null; items: Array<{ productId: string }> };

// Marca o pedido como pago e libera o acesso. Seguro contra corrida:
// webhook, polling do checkout, /success e reconcilePendingOrders podem
// chamar ao mesmo tempo para o mesmo pedido.
async function markPaidAndEnroll(order: OrderWithItems, data: Prisma.OrderUpdateManyMutationInput) {
  const notPaid = { id: order.id, status: { not: "paid" as const } };
  await db.$transaction(async (tx) => {
    // "Claim" atômico: só a chamada que efetivamente muda o pedido para pago
    // segue com matrícula e contadores. As concorrentes esperam o lock da
    // linha e, depois do commit, encontram status = paid (count 0).
    const claimed = await tx.order.updateMany({ where: notPaid, data });
    if (claimed.count !== 1) return;

    for (const item of order.items) {
      const where = { userId_productId: { userId: order.userId, productId: item.productId } };
      const existing = await tx.enrollment.findUnique({ where, select: { id: true } });
      // upsert: reativa matrícula antiga (expirada/cancelada) em caso de recompra.
      await tx.enrollment.upsert({
        where,
        create: { userId: order.userId, productId: item.productId, status: "active", accessType: "lifetime", orderId: order.id },
        update: { status: "active", accessType: "lifetime", expiresAt: null, orderId: order.id },
      });
      if (!existing) {
        await tx.product.update({ where: { id: item.productId }, data: { enrolledCount: { increment: 1 } } });
      }
    }
    if (order.couponCode) {
      // updateMany não lança se o cupom foi apagado (um erro abortaria a transação).
      await tx.coupon.updateMany({ where: { code: order.couponCode }, data: { usedCount: { increment: 1 } } });
    }
  });
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
