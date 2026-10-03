"use server";

import { auth } from "@/lib/auth";
import { computeOrderTotal } from "@/lib/pricing";
import { db } from "@/lib/db";

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

// WhatsApp informado no checkout (opcional): fica no perfil do aluno para contato/suporte.
export async function saveCheckoutPhone(phone: string) {
  const session = await auth();
  if (!session?.user) return { success: false as const };
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 13) return { success: false as const };
  await db.user.update({ where: { id: session.user.id }, data: { phone: phone.trim().slice(0, 30) } });
  return { success: true as const };
}
