import { BarChart2, Users, BookOpen, DollarSign } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RevenueLineChart } from "@/components/charts/revenue-line-chart";
import { RevenueBarChart } from "@/components/charts/revenue-bar-chart";
import { formatCurrency, formatNumber } from "@/lib/utils/cn";
import { getOverviewStats, getRevenueSeries, getCourseAnalyticsList } from "@/lib/analytics";

export default async function AdminAnalyticsPage() {
  const [overview, revenueSeries, courseAnalytics] = await Promise.all([
    getOverviewStats(),
    getRevenueSeries(30),
    getCourseAnalyticsList(),
  ]);

  const overviewCards = [
    {
      label: "Total de alunos", value: formatNumber(overview.totalStudents),
      change: `+${overview.newStudentsThisMonth} este mês`, icon: <Users className="h-4 w-4" />, color: "text-primary",
    },
    {
      label: "Cursos publicados", value: formatNumber(overview.publishedCourses),
      change: `+${overview.newCoursesThisMonth} este mês`, icon: <BookOpen className="h-4 w-4" />, color: "text-success",
    },
    {
      label: "Receita mensal", value: formatCurrency(overview.revenue),
      change: `${overview.revenueChange >= 0 ? "+" : ""}${overview.revenueChange}%`, icon: <DollarSign className="h-4 w-4" />, color: "text-success",
    },
    {
      label: "Taxa de conclusão", value: `${overview.completionRate.toFixed(1)}%`,
      change: `${overview.completionChange >= 0 ? "+" : ""}${overview.completionChange}% vs mês anterior`, icon: <BarChart2 className="h-4 w-4" />, color: "text-warning",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Analytics</h1>
        <p className="text-sm text-foreground-muted mt-0.5">Métricas de performance da plataforma</p>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="courses">Cursos</TabsTrigger>
          <TabsTrigger value="revenue">Receita</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {overviewCards.map((item) => (
              <Card key={item.label} className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-foreground-muted">{item.label}</p>
                  <span className={item.color}>{item.icon}</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{item.value}</p>
                <p className="text-xs text-foreground-muted">{item.change}</p>
              </Card>
            ))}
          </div>

          <Card padding="none">
            <div className="p-4 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">Receita vs Matrículas (últimos 30 dias)</h2>
            </div>
            <div className="p-4">
              <RevenueLineChart data={revenueSeries} />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="courses" className="mt-4">
          <div className="space-y-4">
            {courseAnalytics.map((ca, i) => (
              <Card key={ca.productId} className="flex items-center gap-4">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">{i + 1}</div>
                <img src={ca.thumbnail} className="h-12 w-20 rounded object-cover shrink-0" alt={ca.title} />
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="font-medium text-sm text-foreground truncate">{ca.title}</p>
                  <div className="flex items-center gap-4 text-xs text-foreground-muted flex-wrap">
                    <span>{formatNumber(ca.enrollments)} matrículas</span>
                    <span>{ca.completionRate.toFixed(1)}% conclusão</span>
                    <span>{ca.watchTimeHours.toLocaleString()}h assistidas</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-base font-bold text-foreground">{formatCurrency(ca.revenue)}</p>
                  {ca.avgRating > 0 && <Badge variant="success">★ {ca.avgRating.toFixed(1)}</Badge>}
                </div>
              </Card>
            ))}
            {courseAnalytics.length === 0 && (
              <div className="py-16 text-center text-sm text-foreground-muted border border-dashed border-border rounded-lg">
                Nenhum curso ainda.
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="revenue" className="mt-4">
          <Card padding="none">
            <div className="p-4 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">Receita x Reembolsos</h2>
            </div>
            <div className="p-4">
              <RevenueBarChart data={revenueSeries.slice(-14)} showRefunds height={280} />
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
