export const dynamic = "force-dynamic";
import Link from "next/link";
import { DollarSign, UserPlus, AlertTriangle, Plus } from "lucide-react";
import { requireArea } from "@/lib/auth-guards";
import { getDashboardData, PERIOD_LABEL, type DashboardPeriod } from "@/lib/dashboard";
import { MetricCard, PageHeader, SectionCard, ButtonLink } from "@/components/admin/page-kit";
import { formatCurrency, formatRelativeDate, cn } from "@/lib/utils/cn";

const PERIODS: DashboardPeriod[] = ["hoje", "7d", "30d", "ano"];

function greeting() {
  const hour = Number(new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hour12: false, timeZone: "America/Fortaleza" }).format(new Date()));
  return hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
}

const change = (v: number | null, suffix: string) =>
  v === null ? undefined : `${v >= 0 ? "▲" : "▼"} ${Math.abs(v)}%${suffix}`;

const ACTIVITY_ICON = {
  paid: { icon: <DollarSign className="h-3.5 w-3.5" />, cls: "bg-ok-soft text-ok-text dark:bg-ok/15 dark:text-ok" },
  student: { icon: <UserPlus className="h-3.5 w-3.5" />, cls: "bg-brand-soft text-brand-dark dark:bg-brand/15 dark:text-brand" },
  error: { icon: <AlertTriangle className="h-3.5 w-3.5" />, cls: "bg-danger-soft text-danger dark:bg-danger/15" },
} as const;

export default async function AdminDashboardPage(props: { searchParams: Promise<{ periodo?: string }> }) {
  const session = await requireArea("admin");
  const { periodo } = await props.searchParams;
  const period: DashboardPeriod = PERIODS.includes(periodo as DashboardPeriod) ? (periodo as DashboardPeriod) : "7d";
  const d = await getDashboardData(period);

  const today = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Fortaleza" }).format(new Date());
  const firstName = (session.user.name ?? "").split(" ")[0] || "Admin";
  const max = Math.max(1, ...d.series.map((b) => b.paid + b.pending));
  const prevLabel = period === "hoje" ? " vs ontem" : period === "ano" ? " vs ano anterior" : " vs período anterior";

  return (
    <div>
      <PageHeader
        title={`${greeting()}, ${firstName}`}
        subtitle={<><span className="capitalize">{today}</span> · {PERIOD_LABEL[period]}</>}
        actions={<ButtonLink href="/admin/courses?novo=1" variant="primary"><Plus className="h-4 w-4" /> Novo curso</ButtonLink>}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <MetricCard label="Receita" value={formatCurrency(d.revenue)} hint={change(d.revenueChange, prevLabel)} hintTone={d.revenueChange !== null && d.revenueChange < 0 ? "down" : "up"} />
        <MetricCard label="Pedidos" value={d.orders} hint={d.waiting > 0 ? `${d.waiting} aguardando pagamento` : "nenhum pendente"} hintTone={d.waiting > 0 ? "brand" : "muted"} />
        <MetricCard label="Novos alunos" value={d.newStudents} hint={change(d.newStudentsChange, "")} hintTone={d.newStudentsChange !== null && d.newStudentsChange < 0 ? "down" : "up"} />
        <MetricCard dark label="Horas assistidas" value={`${d.watchedHours.toLocaleString("pt-BR")}h`} hint={d.topCourse ? `Mais visto: ${d.topCourse}` : "sem aulas assistidas no período"} hintTone="brand" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
        <SectionCard
          title={period === "ano" ? "Vendas por mês" : "Vendas por dia"}
          action={
            <span className="flex items-center gap-3 text-[11px] text-foreground-muted">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-brand" /> Pagos</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-line-strong dark:bg-white/20" /> Pendentes</span>
            </span>
          }
        >
          {d.series.every((b) => b.paid + b.pending === 0) ? (
            <p className="px-[18px] pb-10 pt-6 text-center text-sm text-foreground-muted">Nenhuma venda no período.</p>
          ) : (
            <div className="flex h-[260px] items-end gap-1.5 px-[18px] pb-3 pt-4 sm:gap-2.5">
              {d.series.map((b, i) => {
                const total = b.paid + b.pending;
                const last = i === d.series.length - 1;
                return (
                  <div key={i} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5" title={`${b.label}: ${formatCurrency(b.paid)} pagos · ${formatCurrency(b.pending)} pendentes`}>
                    <div className="flex w-full flex-col justify-end overflow-hidden rounded-t-md" style={{ height: `${Math.max(2, (total / max) * 100)}%` }}>
                      {b.pending > 0 && <div className="w-full bg-line-strong dark:bg-white/20" style={{ height: `${(b.pending / total) * 100}%` }} />}
                      {b.paid > 0 && <div className="w-full bg-brand" style={{ height: `${(b.paid / total) * 100}%` }} />}
                    </div>
                    <span className={cn("truncate text-[10px]", last ? "font-bold text-foreground" : "text-foreground-muted")}>{b.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Atividade recente">
          {d.activity.length === 0 ? (
            <p className="px-[18px] pb-8 pt-4 text-center text-sm text-foreground-muted">Nada por aqui ainda.</p>
          ) : (
            <ul className="divide-y divide-line-soft px-[18px] pb-2 dark:divide-white/10">
              {d.activity.map((a, i) => (
                <li key={i}>
                  <Link href={a.href} className="flex items-start gap-3 py-3 hover:opacity-80">
                    <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full", ACTIVITY_ICON[a.kind].cls)}>{ACTIVITY_ICON[a.kind].icon}</span>
                    <span className="min-w-0">
                      <span className="block text-[13.5px] font-semibold text-foreground">{a.title}</span>
                      <span className="block truncate text-[11.5px] text-foreground-muted">
                        {a.detail} · {formatRelativeDate(a.at.toISOString())}
                        {a.kind === "error" && <span className="text-brand"> · ver log</span>}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
