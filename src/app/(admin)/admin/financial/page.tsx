export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { financeRange, getFinanceData, type FinancePeriod } from "@/lib/financial";
import { toggleCoupon, deleteCoupon } from "@/lib/actions/finance";
import { NewCouponDialog } from "./new-coupon-dialog";
import { requireArea } from "@/lib/auth-guards";
import { ActionButton } from "@/components/admin/action-button";
import { MetricCard, PageHeader, SectionCard, Pill, ButtonLink, tableHeadClass } from "@/components/admin/page-kit";
import { formatCurrency, formatDate, cn } from "@/lib/utils/cn";

const PERIODS: FinancePeriod[] = ["atual", "anterior", "ano"];

// Linha de receita acumulada (atual) + período anterior tracejado.
function CumulativeChart({ current, previous }: { current: { label: string; value: number }[]; previous: { label: string; value: number }[] }) {
  const W = 600, H = 240, PAD = 8;
  const n = Math.max(current.length, previous.length, 2);
  const max = Math.max(1, ...current.map((p) => p.value), ...previous.map((p) => p.value));
  const x = (i: number) => PAD + (i / (n - 1)) * (W - PAD * 2);
  const y = (v: number) => H - PAD - (v / max) * (H - PAD * 2);
  const line = (pts: { value: number }[]) => pts.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(" ");
  const area = current.length > 1 ? `${line(current)} L${x(current.length - 1).toFixed(1)} ${H - PAD} L${x(0)} ${H - PAD} Z` : "";
  const ticks = [0, Math.floor((current.length - 1) / 3), Math.floor((2 * (current.length - 1)) / 3), current.length - 1].filter((v, i, a) => v >= 0 && a.indexOf(v) === i);
  return (
    <div className="px-[18px] pb-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-[240px] w-full" preserveAspectRatio="none" role="img" aria-label="Receita acumulada no período">
        <defs>
          <linearGradient id="fin-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#f26a1b" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#f26a1b" stopOpacity="0" />
          </linearGradient>
        </defs>
        {previous.length > 1 && <path d={line(previous)} fill="none" stroke="currentColor" className="text-line-strong dark:text-white/25" strokeWidth="3" strokeDasharray="6 6" vectorEffect="non-scaling-stroke" />}
        {area && <path d={area} fill="url(#fin-area)" />}
        {current.length > 1 && <path d={line(current)} fill="none" stroke="#f26a1b" strokeWidth="3" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
      </svg>
      <div className="mt-1 flex justify-between text-[11px] text-foreground-muted">
        {ticks.map((t, i) => <span key={t}>{i === ticks.length - 1 && t > 0 ? "hoje" : current[t]?.label}</span>)}
      </div>
    </div>
  );
}

export default async function AdminFinancialPage(props: { searchParams: Promise<{ mes?: string; visao?: string }> }) {
  await requireArea("admin");
  const { mes, visao } = await props.searchParams;
  const period: FinancePeriod = PERIODS.includes(mes as FinancePeriod) ? (mes as FinancePeriod) : "atual";
  const d = await getFinanceData(period);
  const range = financeRange(period);
  // Vendas do período (pagas e reembolsadas): quem comprou, o quê e quanto.
  const sales = await db.order.findMany({
    where: { OR: [{ status: "paid", paidAt: { gte: range.start, lt: range.end } }, { status: { in: ["refunded", "chargeback"] }, updatedAt: { gte: range.start, lt: range.end } }] },
    orderBy: [{ paidAt: { sort: "desc", nulls: "last" } }, { updatedAt: "desc" }],
    take: 200,
    select: { id: true, status: true, total: true, paidAt: true, updatedAt: true, paymentMethod: true, couponCode: true,
      user: { select: { name: true, email: true } }, items: { take: 1, select: { product: { select: { title: true } } } } },
  });
  const courtesies = sales.filter((o) => o.status === "paid" && Number(o.total) === 0).length;
  const refundCount = sales.filter((o) => o.status !== "paid").length;
  const METHOD: Record<string, string> = { pix: "Pix", credit_card: "Cartão", debit_card: "Débito", boleto: "Boleto" };
  const coupons = visao === "cupons" ? await db.coupon.findMany({ orderBy: { createdAt: "desc" } }) : [];

  const methodsCard = (
    <SectionCard title="Formas de pagamento">
      {d.methods.length === 0 ? (
        <p className="px-[18px] pb-8 pt-2 text-center text-sm text-foreground-muted">Nenhum pagamento no período.</p>
      ) : (
        <ul className="divide-y divide-line-soft px-[18px] pb-2 dark:divide-white/10">
          {d.methods.map((m) => {
            const share = d.gross > 0 ? Math.round((m.total / d.gross) * 100) : 0;
            return (
              <li key={m.label} className="py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[13.5px] font-semibold text-foreground">{m.label}</span>
                  <span className="text-[13.5px] font-bold text-foreground">{formatCurrency(m.total)}</span>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line-soft dark:bg-white/10"><div className="h-full rounded-full bg-brand" style={{ width: `${share}%` }} /></div>
                  <span className="w-20 text-right text-[11px] text-foreground-muted">{share}% · {m.count} venda{m.count !== 1 ? "s" : ""}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {d.pendingCount > 0 && (
        <p className="border-t border-line-soft px-[18px] py-3 text-xs text-foreground-muted dark:border-white/10">
          + {formatCurrency(d.pendingTotal)} aguardando pagamento ({d.pendingCount} pedido{d.pendingCount !== 1 ? "s" : ""})
        </p>
      )}
    </SectionCard>
  );

  return (
    <div>
      <PageHeader title={d.label} subtitle="Quanto vendeu, quanto saiu em taxa e reembolso, e quanto sobra"
        actions={<ButtonLink href={`/api/admin/export?tipo=financeiro&mes=${period}`} download>Exportar relatório</ButtonLink>} />

      {/* 4 números, cada um uma coisa só */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <MetricCard label="Vendas" value={formatCurrency(d.gross)}
          hint={`${d.salesCount} venda${d.salesCount !== 1 ? "s" : ""}${courtesies ? ` · ${courtesies} cortesia${courtesies !== 1 ? "s" : ""}` : ""}${d.grossChange !== null ? ` · ${d.grossChange >= 0 ? "▲" : "▼"} ${Math.abs(d.grossChange)}% vs ${d.prevLabel}` : ""}`}
          hintTone={d.grossChange !== null && d.grossChange < 0 ? "down" : "muted"} />
        <MetricCard label="Taxa do Mercado Pago" value={d.fees > 0 ? `− ${formatCurrency(d.fees)}` : formatCurrency(0)}
          hint={`estimada em ${d.feePercent.toString().replace(".", ",")}% das vendas`} />
        <MetricCard label="Reembolsos" value={d.refunded > 0 ? `− ${formatCurrency(d.refunded)}` : formatCurrency(0)} valueTone={d.refunded > 0 ? "danger" : undefined}
          hint={refundCount ? `${refundCount} pedido${refundCount !== 1 ? "s" : ""} devolvido${refundCount !== 1 ? "s" : ""} ao aluno` : "nenhum dinheiro devolvido"} />
        <MetricCard dark label="Você recebe" value={formatCurrency(d.net)} hint="vendas − taxa − reembolsos" hintTone="brand" />
      </div>

      {visao === "cupons" ? (
        <SectionCard title="Cupons" className="mt-4" action={<NewCouponDialog />}>
          <div className="overflow-x-auto"><div className="min-w-[760px]">
          <div className={cn("grid grid-cols-[1.2fr_1fr_1fr_0.8fr_1fr_0.8fr_1.4fr] gap-3 border-y border-line-soft bg-[#faf8f5] px-[18px] py-2.5 dark:border-white/10 dark:bg-white/5", tableHeadClass)}>
            <span>Código</span><span>Tipo</span><span>Desconto</span><span>Usos</span><span>Expira</span><span>Status</span><span />
          </div>
          {coupons.map((c) => (
            <div key={c.id} className="grid grid-cols-[1.2fr_1fr_1fr_0.8fr_1fr_0.8fr_1.4fr] items-center gap-3 border-b border-line-soft px-[18px] py-3 text-[13px] last:border-0 dark:border-white/10">
              <span className="font-mono font-semibold text-foreground">{c.code}</span>
              <span className="text-foreground-muted">{c.type === "percentage" ? "Percentual" : "Fixo"}</span>
              <span className="text-foreground">{c.type === "percentage" ? `${Number(c.value)}%` : formatCurrency(Number(c.value))}</span>
              <span className="text-foreground-muted">{c.usedCount}{c.maxUses ? `/${c.maxUses}` : ""}</span>
              <span className="text-foreground-muted">{c.expiresAt ? formatDate(c.expiresAt.toISOString()) : "—"}</span>
              <span><Pill tone={c.isActive ? "ok" : "gray"}>{c.isActive ? "Ativo" : "Inativo"}</Pill></span>
              <span className="flex justify-end gap-2">
                <ActionButton variant="ghost" action={toggleCoupon.bind(null, c.id)} className="h-8 px-3 text-xs">{c.isActive ? "Desativar" : "Ativar"}</ActionButton>
                {c.usedCount === 0 && <ActionButton variant="ghost" action={deleteCoupon.bind(null, c.id)} confirmText={`Excluir o cupom ${c.code}?`} className="h-8 px-3 text-xs text-danger">Excluir</ActionButton>}
              </span>
            </div>
          ))}
          </div></div>
          {coupons.length === 0 && <p className="py-10 text-center text-sm text-foreground-muted">Nenhum cupom cadastrado. Clique em “Novo cupom”.</p>}
        </SectionCard>
      ) : visao === "pagamentos" ? (
        <div className="mt-4">{methodsCard}</div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
            <SectionCard title="Vendas acumuladas"
              action={<span className="flex items-center gap-3 text-[11px] text-foreground-muted">
                <span className="flex items-center gap-1"><span className="h-0.5 w-4 bg-brand" /> {d.label}</span>
                <span className="flex items-center gap-1"><span className="h-0.5 w-4 border-t-2 border-dashed border-line-strong dark:border-white/30" /> {d.prevLabel}</span>
              </span>}>
              {d.gross === 0 && d.previous.every((p) => p.value === 0) ? (
                <p className="px-[18px] pb-10 pt-6 text-center text-sm text-foreground-muted">Nenhuma venda no período.</p>
              ) : (
                <CumulativeChart current={d.current} previous={d.previous} />
              )}
            </SectionCard>
            {methodsCard}
          </div>

          <SectionCard title={`Vendas do período · ${sales.length}`} action={<ButtonLink href="/admin/orders">Todos os pedidos</ButtonLink>}>
            {sales.length === 0 ? (
              <p className="px-[18px] pb-8 pt-2 text-center text-sm text-foreground-muted">Nenhuma venda no período.</p>
            ) : (
              <div className="overflow-x-auto"><div className="min-w-[720px]">
                <div className={cn("grid grid-cols-[90px_minmax(0,1.4fr)_minmax(0,1.2fr)_90px_110px_110px] gap-3 border-y border-line-soft bg-[#faf8f5] px-[18px] py-2.5 dark:border-white/10 dark:bg-white/5", tableHeadClass)}>
                  <span>Data</span><span>Aluno</span><span>Curso</span><span>Forma</span><span>Situação</span><span className="text-right">Valor</span>
                </div>
                {sales.map((o) => {
                  const total = Number(o.total);
                  const refunded = o.status !== "paid";
                  return (
                    <div key={o.id} className="grid grid-cols-[90px_minmax(0,1.4fr)_minmax(0,1.2fr)_90px_110px_110px] items-center gap-3 border-b border-line-soft px-[18px] py-2.5 text-[13px] last:border-0 dark:border-white/10">
                      <span className="text-foreground-muted">{formatDate((o.paidAt ?? o.updatedAt).toISOString())}</span>
                      <span className="min-w-0"><span className="block truncate font-semibold text-foreground">{o.user.name}</span><span className="block truncate text-[11px] text-foreground-muted">{o.user.email}</span></span>
                      <span className="truncate text-foreground">{o.items[0]?.product.title ?? "—"}</span>
                      <span className="text-foreground-muted">{total === 0 ? "—" : o.paymentMethod ? METHOD[o.paymentMethod] ?? o.paymentMethod : "—"}</span>
                      <span>{refunded ? <Pill tone="danger">Reembolsado</Pill> : total === 0 ? <Pill tone="gray">Cortesia{o.couponCode ? ` · ${o.couponCode}` : ""}</Pill> : <Pill tone="ok">Pago{o.couponCode ? " · cupom" : ""}</Pill>}</span>
                      <span className={cn("text-right font-bold", refunded ? "text-danger line-through" : "text-foreground")}>{formatCurrency(total)}</span>
                    </div>
                  );
                })}
              </div></div>
            )}
          </SectionCard>
        </div>
      )}
    </div>
  );
}
