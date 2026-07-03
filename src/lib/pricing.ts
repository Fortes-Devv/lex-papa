import { db } from "@/lib/db";

export async function computeOrderTotal(productId: string, couponCode?: string | null) {
  const product = await db.product.findUnique({ where: { id: productId } });
  if (!product) throw new Error("Produto não encontrado.");

  const subtotal = Number(product.price);
  let discount = 0;
  let appliedCoupon: { code: string } | null = null;

  if (couponCode) {
    const coupon = await db.coupon.findUnique({ where: { code: couponCode.toUpperCase() } });
    if (!coupon) throw new Error("Cupom inválido.");
    if (!coupon.isActive) throw new Error("Cupom inativo.");
    if (coupon.expiresAt && coupon.expiresAt < new Date()) throw new Error("Cupom expirado.");
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) throw new Error("Cupom esgotado.");
    if (coupon.minOrderValue && subtotal < Number(coupon.minOrderValue)) {
      throw new Error(`Cupom válido apenas para pedidos acima de R$ ${Number(coupon.minOrderValue).toFixed(2)}.`);
    }
    discount = coupon.type === "percentage" ? (subtotal * Number(coupon.value)) / 100 : Number(coupon.value);
    discount = Math.min(discount, subtotal);
    appliedCoupon = { code: coupon.code };
  }

  const total = Math.max(subtotal - discount, 0);
  return { product, subtotal, discount, total, coupon: appliedCoupon };
}
