import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";

// Dados do Financeiro do admin por período (mês atual, mês anterior ou ano). Sequencial (driver Neon).

export type FinancePeriod = "atual" | "anterior" | "ano";
const TZ_OFFSET_MS = 3 * 60 * 60 * 1000; // America/Fortaleza (UTC−3)
const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

// Instante UTC do início do mês (ano, mês 0-11) em Fortaleza.
const monthStart = (y: number, m: number) => new Date(Date.UTC(y, m, 1) + TZ_OFFSET_MS);

export function financeRange(period: FinancePeriod, now = new Date()) {
  const local = new Date(now.getTime() - TZ_OFFSET_MS);
  const y = local.getUTCFullYear();
  const m = local.getUTCMonth();
  if (period === "ano") {
    return { start: monthStart(y, 0), end: now, prevStart: monthStart(y - 1, 0), prevEnd: monthStart(y, 0), label: String(y), prevLabel: String(y - 1), byMonth: true };
  }
  if (period === "anterior") {
    return { start: monthStart(y, m - 1), end: monthStart(y, m), prevStart: monthStart(y, m - 2), prevEnd: monthStart(y, m - 1), label: `${MONTHS[(m + 11) % 12]} ${m === 0 ? y - 1 : y}`, prevLabel: MONTHS[(m + 10) % 12].slice(0, 3).toLowerCase(), byMonth: false };
  }
  return { start: monthStart(y, m), end: now, prevStart: monthStart(y, m - 1), prevEnd: monthStart(y, m), label: `${MONTHS[m]} ${y}`, prevLabel: MONTHS[(m + 11) % 12].slice(0, 3).toLowerCase(), byMonth: false };
}

const sum = (rows: { total: unknown }[]) => rows.reduce((s, r) => s + Number(r.total), 0);

// Receita acumulada dia a dia (ou mês a mês) desde o início do período.
function cumulative(orders: { paidAt: Date | null; total: unknown }[], start: Date, end: Date, byMonth: boolean) {
  const points: { label: string; value: number }[] = [];
  const sorted = orders.filter((o) => o.paidAt).sort((a, b) => a.paidAt!.getTime() - b.paidAt!.getTime());
  let acc = 0, i = 0;
  if (byMonth) {
    const local = new Date(start.getTime() - TZ_OFFSET_MS);
    for (let m = 0; m < 12; m++) {
      const until = monthStart(local.getUTCFullYear(), m + 1);
      if (monthStart(local.getUTCFullYear(), m) > end) break;
      while (i < sorted.length && sorted[i].paidAt! < until) acc += Number(sorted[i++].total);
      points.push({ label: MONTHS[m].slice(0, 3), value: acc });
    }
  } else {
    for (let d = new Date(start); d < end; d = new Date(d.getTime() + 86_400_000)) {
      const until = new Date(d.getTime() + 86_400_000);
      while (i < sorted.length && sorted[i].paidAt! < until) acc += Number(sorted[i++].total);
      points.push({ label: String(new Date(d.getTime() - TZ_OFFSET_MS).getUTCDate()), value: acc });
    }
  }
  return points;
}

export async function getFinanceData(period: FinancePeriod) {
  const r = financeRange(period);
  const paid = await db.order.findMany({ where: { status: "paid", paidAt: { gte: r.start, lt: r.end } }, select: { paidAt: true, total: true, paymentMethod: true } });
  const prevPaid = await db.order.findMany({ where: { status: "paid", paidAt: { gte: r.prevStart, lt: r.prevEnd } }, select: { paidAt: true, total: true } });
  const refunds = await db.order.findMany({ where: { status: { in: ["refunded", "chargeback"] }, updatedAt: { gte: r.start, lt: r.end } }, select: { total: true } });
  const pending = await db.order.findMany({ where: { status: { in: ["pending", "processing"] }, createdAt: { gte: r.start, lt: r.end } }, select: { total: true } });

  const settings = await getSettings();
  const gross = sum(paid);
  const fees = Math.round(gross * settings.finance.gatewayFeePercent) / 100;
  const prevGross = sum(prevPaid);
  const refunded = sum(refunds);

  // Formas de pagamento (só pagos no período).
  const METHOD: Record<string, string> = { pix: "PIX", credit_card: "Cartão de crédito", debit_card: "Cartão de débito", boleto: "Boleto", paypal: "PayPal", cortesia: "Cortesia (cupom 100%)" };
  const byMethod = new Map<string, { label: string; total: number; count: number }>();
  for (const o of paid) {
    // Pedido de R$ 0 (cupom de 100%) é cortesia, não forma de pagamento.
    const k = Number(o.total) === 0 ? "cortesia" : o.paymentMethod ?? "outro";
    const cur = byMethod.get(k) ?? { label: METHOD[k] ?? "Outro", total: 0, count: 0 };
    cur.total += Number(o.total); cur.count++;
    byMethod.set(k, cur);
  }

  // Comparação: o período anterior "esticado" no mesmo número de pontos.
  const current = cumulative(paid, r.start, r.end, r.byMonth);
  const previousFull = cumulative(prevPaid, r.prevStart, r.prevEnd, r.byMonth);

  return {
    label: r.label,
    prevLabel: r.prevLabel,
    gross,
    grossChange: prevGross > 0 ? Math.round(((gross - prevGross) / prevGross) * 100) : null,
    refunded,
    fees,
    feePercent: settings.finance.gatewayFeePercent,
    deductionsShare: gross > 0 ? Math.round(((refunded + fees) / gross) * 1000) / 10 : 0,
    net: gross - refunded - fees,
    pendingTotal: sum(pending),
    pendingCount: pending.length,
    salesCount: paid.length,
    current,
    previous: previousFull.slice(0, Math.max(current.length, 1)),
    methods: Array.from(byMethod.values()).sort((a, b) => b.total - a.total),
  };
}
