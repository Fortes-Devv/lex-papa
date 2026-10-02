"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth-guards";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { financeRange, getTeacherPayouts, type FinancePeriod } from "@/lib/financial";

// "Processar repasses": registra como pagos os valores devidos aos professores no período.
// (O PIX/transferência em si é feito fora da plataforma; aqui fica o controle.)
export async function processPayouts(period: FinancePeriod) {
  const session = await requireAdmin();
  const r = financeRange(period);
  const { rows } = await getTeacherPayouts(r.start, r.end);
  const due = rows.filter((x) => x.due > 0);
  if (due.length === 0) return { success: false as const, error: "Não há repasses pendentes neste período." };
  try {
    await db.$transaction(due.map((x) => db.payout.create({
      data: { teacherId: x.teacherId, amount: x.due, periodStart: r.start, periodEnd: r.end, createdById: session.user.id, note: r.label },
    })));
  } catch {
    return { success: false as const, error: "Tabela de repasses ainda não existe. Rode npm run db:deploy." };
  }
  const total = due.reduce((s, x) => s + x.due, 0);
  await logAudit({ actorId: session.user.id, action: "payout.processed", resourceType: "payout", metadata: { period: r.label, teachers: due.length, total } });
  revalidatePath("/admin/financial");
  return { success: true as const, total, teachers: due.length };
}
