"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireModerator } from "@/lib/auth-guards";
import { fulfillManualOrder } from "@/lib/order-fulfillment";
import { db } from "@/lib/db";
import { getMpOrderClient, isMercadoPagoConfigured } from "@/lib/mercadopago";
import { logAudit } from "@/lib/audit";

export async function refundOrder(orderId: string) {
  const session = await requireModerator();

  const order = await db.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) return { success: false as const, error: "Pedido não encontrado." };
  if (order.status !== "paid") return { success: false as const, error: "Só é possível reembolsar pedidos pagos." };

  if (order.mpOrderId && isMercadoPagoConfigured()) {
    try {
      // Reembolso total da Order no Mercado Pago (sem body = total).
      await getMpOrderClient().refund({ id: order.mpOrderId });
    } catch (err) {
      return { success: false as const, error: err instanceof Error ? err.message : "Erro ao reembolsar no Mercado Pago." };
    }
  }

  await db.order.update({ where: { id: orderId }, data: { status: "refunded" } });
  await logAudit({ actorId: session.user.id, action: "order.refunded", resourceType: "order", resourceId: orderId, metadata: { total: Number(order.total) } });

  for (const item of order.items) {
    await db.enrollment.updateMany({
      where: { userId: order.userId, productId: item.productId, orderId: order.id },
      data: { status: "cancelled" },
    });
    await db.product.update({ where: { id: item.productId }, data: { enrolledCount: { decrement: 1 } } }).catch(() => {});
  }

  revalidatePath("/admin/orders");
  return { success: true as const };
}

// "Liberar acesso": marca o pedido como pago e matricula o aluno (pagamento confirmado
// fora do Mercado Pago). Só admin. Fica registrado no log.
export async function releaseOrderAccess(orderId: string) {
  const session = await requireAdmin();
  const order = await db.order.findUnique({ where: { id: orderId }, select: { status: true, total: true } });
  if (!order) return { success: false as const, error: "Pedido não encontrado." };
  if (order.status === "paid") return { success: false as const, error: "Este pedido já está pago." };
  if (order.status === "refunded" || order.status === "chargeback") return { success: false as const, error: "Pedido reembolsado não pode ser liberado." };
  await fulfillManualOrder(orderId);
  await logAudit({ actorId: session.user.id, action: "order.manual_release", resourceType: "order", resourceId: orderId, metadata: { total: Number(order.total), previousStatus: order.status } });
  revalidatePath("/admin/orders");
  return { success: true as const };
}

// "Cancelar": encerra um pedido que ainda não foi pago.
export async function cancelOrder(orderId: string) {
  const session = await requireModerator();
  const result = await db.order.updateMany({ where: { id: orderId, status: { in: ["pending", "processing", "failed"] } }, data: { status: "cancelled" } });
  if (result.count === 0) return { success: false as const, error: "Só pedidos não pagos podem ser cancelados." };
  await logAudit({ actorId: session.user.id, action: "order.cancelled", resourceType: "order", resourceId: orderId });
  revalidatePath("/admin/orders");
  return { success: true as const };
}

// "Copiar Pix": busca no Mercado Pago o código copia-e-cola do Pix pendente para reenviar ao aluno.
export async function getOrderPixCode(orderId: string) {
  await requireModerator();
  const order = await db.order.findUnique({ where: { id: orderId }, select: { mpOrderId: true, status: true } });
  if (!order?.mpOrderId || !isMercadoPagoConfigured()) return { success: false as const, error: "Pedido sem cobrança no Mercado Pago." };
  if (order.status !== "pending" && order.status !== "processing") return { success: false as const, error: "Este pedido não está aguardando pagamento." };
  try {
    const mp = await getMpOrderClient().get({ id: order.mpOrderId });
    const pm = mp.transactions?.payments?.[0]?.payment_method as { qr_code?: string; ticket_url?: string } | undefined;
    const code = pm?.qr_code ?? pm?.ticket_url;
    if (!code) return { success: false as const, error: "Esta cobrança não tem Pix/boleto disponível (pode ter expirado)." };
    return { success: true as const, code, kind: pm?.qr_code ? ("pix" as const) : ("boleto" as const) };
  } catch {
    return { success: false as const, error: "Não foi possível consultar o Mercado Pago." };
  }
}
