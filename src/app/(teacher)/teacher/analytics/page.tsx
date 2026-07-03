import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RevenueAreaChart } from "@/components/charts/revenue-area-chart";
import { auth } from "@/lib/auth";
import { getTeacherRevenueSeries, getCourseAnalyticsList } from "@/lib/analytics";
import { formatCurrency, formatNumber } from "@/lib/utils/cn";

export default async function TeacherAnalyticsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const teacherId = session.user.id;

  const [revenueSeries, courses] = await Promise.all([
    getTeacherRevenueSeries(teacherId, 30),
    getCourseAnalyticsList(undefined, teacherId),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Analytics</h1>
        <p className="text-sm text-foreground-muted mt-0.5">Performance dos seus cursos</p>
      </div>

      <Card padding="none">
        <div className="p-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Receita — últimos 30 dias</h2>
        </div>
        <div className="p-4">
          <RevenueAreaChart data={revenueSeries} />
        </div>
      </Card>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Seus cursos</h2>
        {courses.length === 0 && (
          <div className="py-12 text-center text-sm text-foreground-muted border border-dashed border-border rounded-lg">Nenhum curso ainda.</div>
        )}
        {courses.map((c, i) => (
          <Card key={c.productId} className="flex items-center gap-4">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">{i + 1}</div>
            <img src={c.thumbnail} className="h-12 w-20 rounded object-cover shrink-0" alt={c.title} />
            <div className="flex-1 min-w-0 space-y-1">
              <p className="font-medium text-sm text-foreground truncate">{c.title}</p>
              <div className="flex items-center gap-4 text-xs text-foreground-muted flex-wrap">
                <span>{formatNumber(c.enrollments)} matrículas</span>
                <span>{c.completionRate.toFixed(1)}% conclusão</span>
                <span>{c.watchTimeHours.toLocaleString()}h assistidas</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-base font-bold text-foreground">{formatCurrency(c.revenue)}</p>
              {c.avgRating > 0 && <Badge variant="success">★ {c.avgRating.toFixed(1)}</Badge>}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
