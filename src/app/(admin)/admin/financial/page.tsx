export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { financeRange, getFinanceData, getTeacherPayouts, type FinancePeriod } from "@/lib/financial";
import { processPayouts } from "@/lib/actions/finance";
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
  const session = await requireArea("admin");
  const { mes, visao } = await props.searchParams;
  const period: FinancePeriod = PERIODS.includes(mes as FinancePeriod) ? (mes as FinancePeriod) : "atual";
  const d = await getFinanceData(period);
  const range = financeRange(period);
  const payouts = await getTeacherPayouts(range.start, range.end);
  const isAdmin = session.user.role === "admin";
  const initials = (n: string) => n.split(/s+/).filter(Boolean).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
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
      <PageHeader title={d.label} subtitle="Receita bruta, taxas e líquido do período"
        actions={<ButtonLink href={`/api/admin/export?tipo=financeiro&mes=${period}`} download>Exportar relatório</ButtonLink>} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:gap-4">
        <MetricCard label="Receita bruta" value={formatCurrency(d.gross)}
          hint={d.grossChange === null ? `${d.salesCount} venda${d.salesCount !== 1 ? "s" : ""}` : `${d.grossChange >= 0 ? "▲" : "▼"} ${Math.abs(d.grossChange)}% vs ${d.prevLabel}`}
          hintTone={d.grossChange !== null && d.grossChange < 0 ? "down" : d.grossChange === null ? "muted" : "up"} />
        <MetricCard label="Taxas + reembolsos" value={`− ${formatCurrency(d.fees + d.refunded)}`} valueTone={d.fees + d.refunded > 0 ? "danger" : undefined}
          hint={`${d.deductionsShare.toString().replace(".", ",")}% da receita · taxa estimada ${d.feePercent.toString().replace(".", ",")}%`} />
        <MetricCard label="Líquido" value={formatCurrency(d.net)} hint={payouts.totalDue > 0 ? `${formatCurrency(payouts.totalDue)} a repassar` : "sem repasses pendentes"} hintTone={payouts.totalDue > 0 ? "brand" : "muted"} />
      </div>

      {visao === "cupons" ? (
        <SectionCard title="Cupons" className="mt-4">
          <div className={cn("grid grid-cols-[1.2fr_1fr_1fr_0.8fr_1fr_0.8fr] gap-3 border-y border-line-soft bg-[#faf8f5] px-[18px] py-2.5 dark:border-white/10 dark:bg-white/5", tableHeadClass)}>
            <span>Código</span><span>Tipo</span><span>Desconto</span><span>Usos</span><span>Expira</span><span>Status</span>
          </div>
          {coupons.map((c) => (
            <div key={c.id} className="grid grid-cols-[1.2fr_1fr_1fr_0.8fr_1fr_0.8fr] items-center gap-3 border-b border-line-soft px-[18px] py-3 text-[13px] last:border-0 dark:border-white/10">
              <span className="font-mono font-semibold text-foreground">{c.code}</span>
              <span className="text-foreground-muted">{c.type === "percentage" ? "Percentual" : "Fixo"}</span>
              <span className="text-foreground">{c.type === "percentage" ? `${Number(c.value)}%` : formatCurrency(Number(c.value))}</span>
              <span className="text-foreground-muted">{c.usedCount}{c.maxUses ? `/${c.maxUses}` : ""}</span>
              <span className="text-foreground-muted">{c.expiresAt ? formatDate(c.expiresAt.toISOString()) : "—"}</span>
              <span><Pill tone={c.isActive ? "ok" : "gray"}>{c.isActive ? "Ativo" : "Inativo"}</Pill></span>
            </div>
          ))}
          {coupons.length === 0 && <p className="py-10 text-center text-sm text-foreground-muted">Nenhum cupom cadastrado.</p>}
        </SectionCard>
      ) : visao === "pagamentos" ? (
        <div className="mt-4">{methodsCard}</div>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <SectionCard title="Receita acumulada"
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
          <SectionCard title="Repasses pendentes" action={<span className="text-[11px] text-foreground-muted">comissão {payouts.rate}%</span>}>
            {payouts.rows.length === 0 ? (
              <p className="px-[18px] pb-8 pt-2 text-center text-sm text-foreground-muted">Nenhuma venda com módulo de professor no período.</p>
            ) : (
              <ul className="divide-y divide-line-soft px-[18px] dark:divide-white/10">
                {payouts.rows.map((t) => (
                  <li key={t.teacherId} className="flex items-center gap-3 py-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-navy text-[11px] font-extrabold text-brand">{initials(t.name)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-semibold text-foreground">Prof. {t.name.split(" ")[0]}</span>
                      <span className="block text-[11px] text-foreground-muted">{t.modules} módulo{t.modules !== 1 ? "s" : ""}{t.paid > 0 ? ` · já pago ${formatCurrency(t.paid)}` : ""}</span>
                    </span>
                    <span className={cn("text-[13.5px] font-bold", t.due > 0 ? "text-foreground" : "text-foreground-muted")}>{formatCurrency(t.due)}</span>
                  </li>
                ))}
              </ul>
            )}
            {isAdmin && payouts.totalDue > 0 && (
              <div className="p-[18px] pt-2">
                <ActionButton action={processPayouts.bind(null, period)} okText="Repasses registrados como pagos." className="w-full"
                  confirmText={`Registrar ${formatCurrency(payouts.totalDue)} como pagos aos professores (${d.label})? Faça o PIX/transferência fora da plataforma.`}>
                  Processar repasses · {formatCurrency(payouts.totalDue)}
                </ActionButton>
              </div>
            )}
          </SectionCard>
        </div>
      )}
      {!visao && <div className="mt-4">{methodsCard}</div>}
    </div>
  );
}
