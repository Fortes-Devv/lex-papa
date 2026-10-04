import { db } from "@/lib/db";

// Dados do Dashboard do admin por período. Sequencial (driver Neon).

export type DashboardPeriod = "hoje" | "7d" | "30d" | "ano";
export const PERIOD_LABEL: Record<DashboardPeriod, string> = { hoje: "hoje", "7d": "últimos 7 dias", "30d": "últimos 30 dias", ano: "este ano" };

const TZ_OFFSET_MS = 3 * 60 * 60 * 1000; // America/Fortaleza (UTC−3, sem horário de verão)

// Início do dia em Fortaleza, em UTC.
function startOfDayBR(d: Date) {
  const local = new Date(d.getTime() - TZ_OFFSET_MS);
  local.setUTCHours(0, 0, 0, 0);
  return new Date(local.getTime() + TZ_OFFSET_MS);
}

export function periodRange(period: DashboardPeriod, now = new Date()) {
  const today = startOfDayBR(now);
  let start: Date;
  if (period === "hoje") start = today;
  else if (period === "7d") start = new Date(today.getTime() - 6 * 86_400_000);
  else if (period === "30d") start = new Date(today.getTime() - 29 * 86_400_000);
  else {
    const local = new Date(now.getTime() - TZ_OFFSET_MS);
    start = new Date(Date.UTC(local.getUTCFullYear(), 0, 1) + TZ_OFFSET_MS);
  }
  const length = now.getTime() - start.getTime();
  return { start, end: now, prevStart: new Date(start.getTime() - length), prevEnd: start };
}

const pct = (curr: number, prev: number) => (prev > 0 ? Math.round(((curr - prev) / prev) * 100) : null);

export async function getDashboardData(period: DashboardPeriod) {
  const { start, end, prevStart, prevEnd } = periodRange(period);

  const revenue = Number((await db.order.aggregate({ _sum: { total: true }, where: { status: "paid", paidAt: { gte: start, lte: end } } }))._sum.total ?? 0);
  const prevRevenue = Number((await db.order.aggregate({ _sum: { total: true }, where: { status: "paid", paidAt: { gte: prevStart, lt: prevEnd } } }))._sum.total ?? 0);
  const orders = await db.order.count({ where: { createdAt: { gte: start, lte: end } } });
  const waiting = await db.order.count({ where: { createdAt: { gte: start, lte: end }, status: { in: ["pending", "processing"] } } });
  const newStudents = await db.user.count({ where: { role: "student", createdAt: { gte: start, lte: end } } });
  const prevNewStudents = await db.user.count({ where: { role: "student", createdAt: { gte: prevStart, lt: prevEnd } } });

  // Horas assistidas no período (progresso atualizado no período) e o curso mais visto.
  const watched = await db.lessonProgress.groupBy({ by: ["courseId"], where: { updatedAt: { gte: start, lte: end } }, _sum: { watchedSeconds: true } });
  const watchedSeconds = watched.reduce((s, w) => s + (w._sum.watchedSeconds ?? 0), 0);
  const top = [...watched].sort((a, b) => (b._sum.watchedSeconds ?? 0) - (a._sum.watchedSeconds ?? 0))[0];
  const topCourse = top ? await db.course.findUnique({ where: { id: top.courseId }, select: { product: { select: { title: true } } } }) : null;

  // Vendas por dia (ou por mês no "este ano"): pagos x pendentes.
  const periodOrders = await db.order.findMany({
    where: { createdAt: { gte: start, lte: end }, status: { in: ["paid", "pending", "processing"] } },
    select: { createdAt: true, total: true, status: true },
  });
  const byMonth = period === "ano";
  const buckets = new Map<string, { label: string; paid: number; pending: number }>();
  const keyOf = (d: Date) => {
    const local = new Date(d.getTime() - TZ_OFFSET_MS);
    return byMonth ? local.toISOString().slice(0, 7) : local.toISOString().slice(0, 10);
  };
  const DOW = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const MON = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  if (byMonth) {
    const local = new Date(end.getTime() - TZ_OFFSET_MS);
    for (let m = 0; m <= local.getUTCMonth(); m++) buckets.set(`${local.getUTCFullYear()}-${String(m + 1).padStart(2, "0")}`, { label: MON[m], paid: 0, pending: 0 });
  } else {
    const days = period === "hoje" ? 1 : period === "7d" ? 7 : 30;
    for (let i = 0; i < days; i++) {
      const d = new Date(start.getTime() + i * 86_400_000);
      const local = new Date(d.getTime() - TZ_OFFSET_MS);
      buckets.set(keyOf(d), { label: days <= 7 ? DOW[local.getUTCDay()] : String(local.getUTCDate()), paid: 0, pending: 0 });
    }
  }
  for (const o of periodOrders) {
    const b = buckets.get(keyOf(o.createdAt));
    if (!b) continue;
    if (o.status === "paid") b.paid += Number(o.total); else b.pending += Number(o.total);
  }

  // Atividade recente: pedidos pagos, alunos novos e falhas de webhook.
  const paidOrders = await db.order.findMany({
    where: { status: "paid", paidAt: { not: null } }, orderBy: { paidAt: "desc" }, take: 4,
    select: { id: true, paidAt: true, user: { select: { name: true } }, items: { take: 1, select: { product: { select: { title: true } } } } },
  });
  const students = await db.user.findMany({ where: { role: "student" }, orderBy: { createdAt: "desc" }, take: 3, select: { name: true, createdAt: true } });
  const failures = await db.auditLog.findMany({ where: { action: { in: ["payment.webhook_failed", "system.server_error"] } }, orderBy: { createdAt: "desc" }, take: 2, select: { id: true, createdAt: true, action: true } });

  const activity = [
    ...paidOrders.map((o) => ({ kind: "paid" as const, at: o.paidAt!, title: `Pedido #${o.id.slice(-6).toUpperCase()} pago`, detail: `${o.user.name.split(" ")[0]} · ${o.items[0]?.product.title ?? "Produto"}`, href: `/admin/orders?q=${o.id}` })),
    ...students.map((s) => ({ kind: "student" as const, at: s.createdAt, title: "Nova conta cadastrada", detail: s.name, href: "/admin/users" })),
    ...failures.map((f) => ({ kind: "error" as const, at: f.createdAt, title: f.action === "system.server_error" ? "Erro no sistema" : "Webhook de pagamento falhou", detail: f.action === "system.server_error" ? "Logs" : "Integrações", href: "/admin/logs?nivel=erro" })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 6);

  return {
    revenue, revenueChange: pct(revenue, prevRevenue),
    orders, waiting,
    newStudents, newStudentsChange: pct(newStudents, prevNewStudents),
    watchedHours: Math.round(watchedSeconds / 3600),
    topCourse: topCourse?.product.title ?? null,
    series: Array.from(buckets.values()),
    activity,
  };
}
