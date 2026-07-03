"use server";

import { auth } from "@/lib/auth";
import { computeOrderTotal } from "@/lib/pricing";

export async function applyCoupon(productId: string, couponCode: string) {
  const session = await auth();
  if (!session?.user) return { success: false as const, error: "Faça login para continuar." };

  try {
    const { subtotal, discount, total, coupon } = await computeOrderTotal(productId, couponCode);
    return { success: true as const, subtotal, discount, total, couponCode: coupon?.code ?? null };
  } catch (err) {
    return { success: false as const, error: err instanceof Error ? err.message : "Erro ao aplicar cupom." };
  }
}
