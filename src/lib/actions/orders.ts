"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getMpRefundClient, isMercadoPagoConfigured } from "@/lib/mercadopago";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "admin" && session.user.role !== "moderator")) {
    throw new Error("Não autorizado.");
  }
  return session;
}

export async function refundOrder(orderId: string) {
  await requireAdmin();

  const order = await db.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) return { success: false as const, error: "Pedido não encontrado." };
  if (order.status !== "paid") return { success: false as const, error: "Só é possível reembolsar pedidos pagos." };

  if (order.mpPaymentId && isMercadoPagoConfigured()) {
    try {
      await getMpRefundClient().create({ payment_id: order.mpPaymentId });
    } catch (err) {
      return { success: false as const, error: err instanceof Error ? err.message : "Erro ao reembolsar no Mercado Pago." };
    }
  }

  await db.order.update({ where: { id: orderId }, data: { status: "refunded" } });

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
