import { db } from "@/lib/db";

export type MpPaymentMethod = "credit_card" | "debit_card" | "pix" | "boleto" | "paypal";

// MP usa payment_type_id ("credit_card", "debit_card", "ticket", "bank_transfer")
// e payment_method_id ("pix", "bolbradesco", etc). Traduz para o enum do nosso schema.
export function mapMpPaymentMethod(paymentTypeId?: string | null, paymentMethodId?: string | null): MpPaymentMethod | undefined {
  if (paymentMethodId === "pix" || paymentTypeId === "bank_transfer") return "pix";
  if (paymentTypeId === "ticket") return "boleto";
  if (paymentTypeId === "credit_card") return "credit_card";
  if (paymentTypeId === "debit_card") return "debit_card";
  return undefined;
}

export async function fulfillOrder(orderId: string, mp: { paymentId: string; status: string; statusDetail?: string | null; paymentMethod?: MpPaymentMethod }) {
  const order = await db.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) return;

  // Idempotência: se já processamos esse mesmo paymentId como pago, não repete.
  if (order.mpPaymentId === mp.paymentId && order.status === "paid") return;

  const status = mp.status === "approved" ? "paid" : mp.status === "rejected" ? "failed" : mp.status === "cancelled" ? "cancelled" : mp.status === "in_process" || mp.status === "authorized" ? "processing" : "pending";

  await db.order.update({
    where: { id: orderId },
    data: {
      status,
      mpPaymentId: mp.paymentId,
      mpStatusDetail: mp.statusDetail ?? undefined,
      paymentMethod: mp.paymentMethod ?? order.paymentMethod ?? undefined,
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
          data: {
            userId: order.userId,
            productId: item.productId,
            status: "active",
            accessType: "lifetime",
            orderId: order.id,
          },
        });
        await db.product.update({ where: { id: item.productId }, data: { enrolledCount: { increment: 1 } } });
      }
    }
    if (order.couponCode) {
      await db.coupon.update({ where: { code: order.couponCode }, data: { usedCount: { increment: 1 } } }).catch(() => {});
    }
  }
}
