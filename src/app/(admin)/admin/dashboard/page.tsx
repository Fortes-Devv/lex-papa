import {
  Users, DollarSign, BookOpen, TrendingUp, ShoppingCart, ArrowUpRight,
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { RevenueAreaChart } from "@/components/charts/revenue-area-chart";
import { formatCurrency, formatRelativeDate } from "@/lib/utils/cn";
import { db } from "@/lib/db";
import { getDashboardMetrics, getRevenueSeries, getCourseAnalyticsList } from "@/lib/analytics";

const metricIcons = [
  <DollarSign key="revenue" className="h-4 w-4" />,
  <Users key="students" className="h-4 w-4" />,
  <BookOpen key="enrollments" className="h-4 w-4" />,
  <TrendingUp key="completion" className="h-4 w-4" />,
  <ShoppingCart key="ticket" className="h-4 w-4" />,
  <ArrowUpRight key="refunds" className="h-4 w-4" />,
];
const metricFormats: ("currency" | "number" | "percent")[] = [
  "currency", "number", "number", "percent", "currency", "percent",
];

const statusColors: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  paid: "success", pending: "warning", processing: "warning", refunded: "destructive", failed: "destructive", cancelled: "secondary", chargeback: "destructive",
};
const statusLabels: Record<string, string> = {
  paid: "Pago", pending: "Pendente", processing: "Processando", refunded: "Reembolsado", failed: "Falhou", cancelled: "Cancelado", chargeback: "Chargeback",
};

export default async function AdminDashboardPage() {
  const [metrics, revenueSeries, topCourses, recentOrders, recentUsers] = await Promise.all([
    getDashboardMetrics(),
    getRevenueSeries(30),
    getCourseAnalyticsList(3),
    db.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { user: true, items: { include: { product: true }, take: 1 } },
    }),
    db.user.findMany({ where: { role: "student" }, orderBy: { createdAt: "desc" }, take: 4 }),
  ]);

  const revenueTotal = revenueSeries.reduce((s, d) => s + d.revenue, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-foreground-muted mt-0.5">Visão geral da plataforma — últimos 30 dias</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {metrics.map((metric, i) => (
          <StatCard key={metric.label} metric={metric} format={metricFormats[i]} icon={metricIcons[i]} />
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card padding="none" className="xl:col-span-2">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Receita — últimos 30 dias</h2>
              <p className="text-xs text-foreground-muted mt-0.5">Total: {formatCurrency(revenueTotal)}</p>
            </div>
          </div>
          <div className="p-5">
            <RevenueAreaChart data={revenueSeries} />
          </div>
        </Card>

        <Card padding="none">
          <div className="p-5 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Cursos em destaque</h2>
            <p className="text-xs text-foreground-muted mt-0.5">Por matrículas</p>
          </div>
          <div className="p-5 space-y-4">
            {topCourses.map((course) => (
              <div key={course.productId} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <img src={course.thumbnail} className="h-8 w-8 rounded object-cover shrink-0" alt={course.title} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{course.title}</p>
                    <p className="text-2xs text-foreground-muted">{course.enrollments} alunos</p>
                  </div>
                </div>
                <Progress value={course.completionRate} size="xs" showLabel label={`${course.completionRate.toFixed(0)}% conclusão`} />
              </div>
            ))}
            {topCourses.length === 0 && <p className="text-xs text-foreground-muted text-center py-4">Nenhum curso ainda.</p>}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card padding="none" className="xl:col-span-2">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Pedidos recentes</h2>
            <a href="/admin/orders" className="text-xs text-primary hover:underline">Ver todos</a>
          </div>
          <div className="divide-y divide-border">
            {recentOrders.map((order) => (
              <div key={order.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors">
                <Avatar src={order.user.avatar ?? undefined} name={order.user.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{order.user.name}</p>
                  <p className="text-xs text-foreground-muted truncate">{order.items[0]?.product.title}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-foreground">{formatCurrency(Number(order.total))}</p>
                  <p className="text-xs text-foreground-muted">{formatRelativeDate(order.createdAt.toISOString())}</p>
                </div>
                <Badge variant={statusColors[order.status] ?? "secondary"}>{statusLabels[order.status] ?? order.status}</Badge>
              </div>
            ))}
            {recentOrders.length === 0 && <p className="text-xs text-foreground-muted text-center py-8">Nenhum pedido ainda.</p>}
          </div>
        </Card>

        <Card padding="none">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Novos usuários</h2>
            <a href="/admin/users" className="text-xs text-primary hover:underline">Ver todos</a>
          </div>
          <div className="divide-y divide-border">
            {recentUsers.map((user) => (
              <div key={user.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors">
                <Avatar src={user.avatar ?? undefined} name={user.name} size="sm" status="online" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
                  <p className="text-xs text-foreground-muted truncate">{user.email}</p>
                </div>
                <Badge variant={user.status === "active" ? "success" : "secondary"} dot>
                  {user.status === "active" ? "Ativo" : "Inativo"}
                </Badge>
              </div>
            ))}
            {recentUsers.length === 0 && <p className="text-xs text-foreground-muted text-center py-8">Nenhum aluno ainda.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
