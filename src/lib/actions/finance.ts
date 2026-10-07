"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth-guards";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";

// ── Cupons (Financeiro › Cupons) ────────────────────────────────────────────

export async function createCoupon(input: { code: string; type: "percentage" | "fixed"; value: number; maxUses?: number | null; expiresAt?: string | null; minOrderValue?: number | null }) {
  const session = await requireAdmin();
  const code = input.code.trim().toUpperCase();
  if (!/^[A-Z0-9_-]{3,30}$/.test(code)) return { success: false as const, error: "Código: 3 a 30 letras, números, - ou _ (sem espaço)." };
  if (!Number.isFinite(input.value) || input.value <= 0) return { success: false as const, error: "Informe o valor do desconto." };
  if (input.type === "percentage" && input.value > 100) return { success: false as const, error: "Percentual vai até 100%." };
  if (input.maxUses != null && (!Number.isInteger(input.maxUses) || input.maxUses < 1)) return { success: false as const, error: "Limite de usos inválido." };
  if (input.expiresAt && !/^\d{4}-\d{2}-\d{2}$/.test(input.expiresAt)) return { success: false as const, error: "Data de validade inválida." };
  if (await db.coupon.findUnique({ where: { code } })) return { success: false as const, error: "Já existe um cupom com esse código." };

  await db.coupon.create({
    data: {
      code,
      type: input.type,
      value: input.value,
      maxUses: input.maxUses ?? null,
      // Vale até o fim do dia escolhido (horário de Fortaleza).
      expiresAt: input.expiresAt ? new Date(`${input.expiresAt}T23:59:59-03:00`) : null,
      minOrderValue: input.minOrderValue && input.minOrderValue > 0 ? input.minOrderValue : null,
    },
  });
  await logAudit({ actorId: session.user.id, action: "coupon.created", resourceType: "coupon", resourceId: code, metadata: { type: input.type, value: input.value } });
  revalidatePath("/admin/financial");
  return { success: true as const };
}

export async function toggleCoupon(id: string) {
  const session = await requireAdmin();
  const coupon = await db.coupon.findUnique({ where: { id }, select: { isActive: true, code: true } });
  if (!coupon) return { success: false as const, error: "Cupom não encontrado." };
  await db.coupon.update({ where: { id }, data: { isActive: !coupon.isActive } });
  await logAudit({ actorId: session.user.id, action: coupon.isActive ? "coupon.deactivated" : "coupon.activated", resourceType: "coupon", resourceId: coupon.code });
  revalidatePath("/admin/financial");
  return { success: true as const, message: coupon.isActive ? "Cupom desativado." : "Cupom ativado." };
}

// Cupom já usado em pedidos não é apagado (histórico); só desativado.
export async function deleteCoupon(id: string) {
  const session = await requireAdmin();
  const coupon = await db.coupon.findUnique({ where: { id }, select: { code: true, _count: { select: { orders: true } } } });
  if (!coupon) return { success: false as const, error: "Cupom não encontrado." };
  if (coupon._count.orders > 0) return { success: false as const, error: "Este cupom já foi usado em pedidos. Desative em vez de excluir." };
  await db.coupon.delete({ where: { id } });
  await logAudit({ actorId: session.user.id, action: "coupon.deleted", resourceType: "coupon", resourceId: coupon.code });
  revalidatePath("/admin/financial");
  return { success: true as const, message: "Cupom excluído." };
}
