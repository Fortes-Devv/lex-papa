export const dynamic = "force-dynamic";
import Link from "next/link";
import { db } from "@/lib/db";
import { getOverviewStats, getCourseAnalyticsList } from "@/lib/analytics";
import { getCourseEngagement } from "@/lib/engagement";
import { MetricCard, PageHeader, SectionCard, Pill, ButtonLink, tableHeadClass } from "@/components/admin/page-kit";
import { CdnImg } from "@/components/ui/cdn-img";
import { formatCurrency, formatNumber, cn } from "@/lib/utils/cn";

const initials = (name: string | null, fallback: string) =>
  name ? name.split(/\s+/).filter(Boolean).map((p) => p[0]).slice(0, 2).join("").toUpperCase() : fallback;

// Analytics (modelo 5g). ?relatorio=geral|engajamento, ?curso=<courseId>, ?dias=7|30.
export default async function AdminAnalyticsPage(props: { searchParams: Promise<{ relatorio?: string; curso?: string; dias?: string }> }) {
  const sp = await props.searchParams;
  const days = sp.dias === "7" ? 7 : 30;
  const courses = await db.course.findMany({
    where: { product: { type: "course" } },
    orderBy: { product: { enrolledCount: "desc" } },
    select: { id: true, product: { select: { title: true, enrolledCount: true } } },
  });
  const view = sp.relatorio === "geral" || courses.length === 0 ? "geral" : "engajamento";
  const selected = courses.find((c) => c.id === sp.curso) ?? courses[0];

  if (view === "geral") {
    const overview = await getOverviewStats();
    const list = await getCourseAnalyticsList();
    return (
      <div>
        <PageHeader title="Visão geral" subtitle="Números da plataforma · mês atual" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          <MetricCard label="Total de alunos" value={formatNumber(overview.totalStudents)} hint={`+${overview.newStudentsThisMonth} este mês`} hintTone="up" />
          <MetricCard label="Cursos publicados" value={formatNumber(overview.publishedCourses)} hint={`+${overview.newCoursesThisMonth} este mês`} />
          <MetricCard label="Receita do mês" value={formatCurrency(overview.revenue)} hint={`${overview.revenueChange >= 0 ? "▲" : "▼"} ${Math.abs(overview.revenueChange)}% vs mês anterior`} hintTone={overview.revenueChange < 0 ? "down" : "up"} />
          <MetricCard label="Conclusão média" value={`${overview.completionRate.toFixed(0)}%`} hint="progresso médio das matrículas" />
        </div>
        <SectionCard title="Por curso" className="mt-4">
          <div className={cn("hidden grid-cols-[minmax(220px,2fr)_100px_110px_100px_120px] gap-3 border-y border-line-soft bg-[#faf8f5] px-[18px] py-2.5 md:grid dark:border-white/10 dark:bg-white/5", tableHeadClass)}>
            <span>Curso</span><span>Matrículas</span><span>Conclusão</span><span>Horas</span><span>Receita</span>
          </div>
          {list.map((c) => (
            <div key={c.productId} className="grid grid-cols-2 items-center gap-3 border-b border-line-soft px-[18px] py-3 text-[13px] last:border-0 md:grid-cols-[minmax(220px,2fr)_100px_110px_100px_120px] dark:border-white/10">
              <span className="col-span-2 flex min-w-0 items-center gap-3 md:col-span-1">
                <CdnImg width={56} src={c.thumbnail} aspect="16:10" alt="" className="h-[30px] w-12 shrink-0 rounded-md bg-navy object-cover" />
                <span className="truncate font-semibold text-foreground">{c.title}</span>
              </span>
              <span className="text-foreground">{c.enrollments} <span className="text-foreground-muted md:hidden">matrículas</span></span>
              <span className="text-foreground">{c.completionRate.toFixed(0)}% <span className="text-foreground-muted md:hidden">conclusão</span></span>
              <span className="text-foreground-muted">{c.watchTimeHours}h</span>
              <span className="font-semibold text-foreground">{formatCurrency(c.revenue)}</span>
            </div>
          ))}
          {list.length === 0 && <p className="py-10 text-center text-sm text-foreground-muted">Nenhum curso ainda.</p>}
        </SectionCard>
      </div>
    );
  }

  const e = await getCourseEngagement(selected!.id, days);
  const qs = (patch: Record<string, string>) => {
    const next = new URLSearchParams({ relatorio: "engajamento", curso: selected!.id, dias: String(days), ...patch });
    return `/admin/analytics?${next}`;
  };

  return (
    <div>
      <PageHeader title="Engajamento" subtitle={`${selected!.product.title} · últimos ${days} dias`}
        actions={<ButtonLink href={`/api/admin/export?tipo=analytics&curso=${selected!.id}&dias=${days}`} download>Exportar CSV</ButtonLink>} />

      {courses.length > 1 && (
        <div className="no-scrollbar -mx-1 mb-4 flex gap-2 overflow-x-auto px-1">
          {courses.map((c) => (
            <Link key={c.id} href={qs({ curso: c.id })}
              className={cn("inline-flex h-9 shrink-0 items-center rounded-full border px-3.5 text-xs font-semibold",
                c.id === selected!.id ? "border-navy bg-navy text-white" : "border-line-strong bg-card text-ink-2 dark:border-white/10 dark:text-foreground-muted")}>
              {c.product.title}
            </Link>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <MetricCard label="Alunos ativos" value={formatNumber(e.activeStudents)} hint={e.enrolled ? `${e.baseShare}% da base (${e.enrolled})` : "sem matrículas"} />
        <MetricCard label="Horas assistidas" value={`${formatNumber(e.watchedHours)}h`} hint={`últimos ${days} dias`} />
        <MetricCard label="Conclusão média" value={`${e.avgCompletion}%`} hint="das matrículas do curso" />
        <MetricCard label="PDFs baixados" value={formatNumber(e.pdfDownloads)} hint={`${formatNumber(e.completedLessons)} aulas concluídas no período`} />
      </div>

      <SectionCard title="Por módulo" action={<span className="text-[11px] text-foreground-muted">desde o início · abandono = parado há 14+ dias</span>} className="mt-4">
        <div className={cn("hidden grid-cols-[minmax(220px,2fr)_80px_minmax(160px,1.4fr)_90px_90px] gap-3 border-y border-line-soft bg-[#faf8f5] px-[18px] py-2.5 md:grid dark:border-white/10 dark:bg-white/5", tableHeadClass)}>
          <span>Módulo</span><span>Alunos</span><span>Conclusão</span><span>Tempo médio</span><span>Abandono</span>
        </div>
        {e.modules.map((m, i) => (
          <div key={m.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 border-b border-line-soft px-[18px] py-3 last:border-0 md:grid-cols-[minmax(220px,2fr)_80px_minmax(160px,1.4fr)_90px_90px] dark:border-white/10">
            <span className="flex min-w-0 items-center gap-3">
              <span className="grid h-[30px] w-12 shrink-0 place-items-end justify-start rounded-md bg-navy px-1.5 pb-0.5 text-[10px] font-extrabold text-brand">{initials(m.instructor, String(i + 1).padStart(2, "0"))}</span>
              <span className="min-w-0">
                <span className="block truncate text-[13.5px] font-bold text-foreground">{m.title}</span>
                <span className="block truncate text-[11px] text-foreground-muted">{m.instructor ? `Prof. ${m.instructor.split(" ")[0]}` : "sem professor"} · {m.lessons} aulas</span>
              </span>
            </span>
            <span className="text-right text-[13.5px] text-foreground md:text-left">{m.students}</span>
            <span className="col-span-2 flex items-center gap-2 md:col-span-1">
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-line-soft dark:bg-white/10">
                <span className={cn("block h-full rounded-full", m.completion < 25 ? "bg-danger" : "bg-brand")} style={{ width: `${m.completion}%` }} />
              </span>
              <span className="w-9 text-right text-[12.5px] font-semibold text-foreground">{m.completion}%</span>
            </span>
            <span className="text-[13px] text-foreground-muted">{m.avgMinutes} min</span>
            <span><Pill tone={m.abandonment >= 40 ? "danger" : m.abandonment >= 20 ? "brand" : "ok"}>{m.abandonment}%</Pill></span>
          </div>
        ))}
        {e.modules.length === 0 && <p className="py-10 text-center text-sm text-foreground-muted">Este curso ainda não tem módulos.</p>}
      </SectionCard>
    </div>
  );
}
