"use client";
import { useEffect, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from "recharts";
import {
  Users, DollarSign, BookOpen, ShoppingCart, TrendingUp, ArrowUpRight, Eye, Clock
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { SkeletonTable, Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { formatCurrency, formatRelativeDate } from "@/lib/utils/cn";
import {
  MOCK_ANALYTICS_METRICS, MOCK_REVENUE_DATA, MOCK_ORDERS,
  MOCK_PRODUCTS, MOCK_COURSE_ANALYTICS, MOCK_USERS
} from "@/lib/mock/data";
import type { AnalyticsMetric } from "@/lib/types";

const metricIcons = [
  <DollarSign className="h-4 w-4" />,
  <Users className="h-4 w-4" />,
  <BookOpen className="h-4 w-4" />,
  <TrendingUp className="h-4 w-4" />,
  <ShoppingCart className="h-4 w-4" />,
  <ArrowUpRight className="h-4 w-4" />,
];

const metricFormats: ("currency" | "number" | "percent")[] = [
  "currency", "number", "number", "percent", "currency", "percent"
];

const statusColors: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  paid: "success", pending: "warning", refunded: "destructive", failed: "destructive", cancelled: "secondary"
};
const statusLabels: Record<string, string> = {
  paid: "Pago", pending: "Pendente", refunded: "Reembolsado", failed: "Falhou", cancelled: "Cancelado"
};

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);

  useEffect(() => { setTimeout(() => setLoading(false), 600); }, []);

  const recentOrders = MOCK_ORDERS.slice(0, 5);
  const topProducts = MOCK_COURSE_ANALYTICS.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-foreground-muted mt-0.5">Visão geral da plataforma — hoje</p>
      </div>

      {/* Metrics */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-5 space-y-3">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {MOCK_ANALYTICS_METRICS.map((metric, i) => (
            <StatCard
              key={metric.label}
              metric={metric}
              format={metricFormats[i]}
              icon={metricIcons[i]}
            />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Revenue chart */}
        <Card padding="none" className="xl:col-span-2">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Receita — últimos 30 dias</h2>
              <p className="text-xs text-foreground-muted mt-0.5">
                Total: {formatCurrency(MOCK_REVENUE_DATA.reduce((s, d) => s + d.revenue, 0))}
              </p>
            </div>
            <Badge variant="success" dot>Ao vivo</Badge>
          </div>
          <div className="p-5">
            {loading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={MOCK_REVENUE_DATA} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(237 85% 65%)" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="hsl(237 85% 65%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--foreground-muted))" }} tickLine={false} axisLine={false} interval={4} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--foreground-muted))" }} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }}
                    formatter={(value: number) => [formatCurrency(value), "Receita"]}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(237 85% 65%)" strokeWidth={2} fill="url(#revenueGrad)" dot={false} activeDot={{ r: 4, fill: "hsl(237 85% 65%)" }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Top courses */}
        <Card padding="none">
          <div className="p-5 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Cursos em destaque</h2>
            <p className="text-xs text-foreground-muted mt-0.5">Por receita gerada</p>
          </div>
          <div className="p-5 space-y-4">
            {MOCK_PRODUCTS.filter((p) => p.type === "course").slice(0, 3).map((product, i) => {
              const analytics = topProducts[i];
              return (
                <div key={product.id} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <img src={product.thumbnail} className="h-8 w-8 rounded object-cover shrink-0" alt={product.title} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{product.title}</p>
                      <p className="text-2xs text-foreground-muted">{analytics?.enrollments ?? 0} alunos</p>
                    </div>
                  </div>
                  <Progress value={analytics?.completionRate ?? 0} size="xs" showLabel label={`${analytics?.completionRate?.toFixed(0) ?? 0}% conclusão`} />
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent orders */}
        <Card padding="none" className="xl:col-span-2">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Pedidos recentes</h2>
            <a href="/admin/orders" className="text-xs text-primary hover:underline">Ver todos</a>
          </div>
          <div className="divide-y divide-border">
            {recentOrders.map((order) => (
              <div key={order.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors">
                <Avatar src={order.user?.avatar} name={order.user?.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{order.user?.name}</p>
                  <p className="text-xs text-foreground-muted truncate">{order.items[0]?.product?.title}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-foreground">{formatCurrency(order.total)}</p>
                  <p className="text-xs text-foreground-muted">{formatRelativeDate(order.createdAt)}</p>
                </div>
                <Badge variant={statusColors[order.status] ?? "secondary"}>{statusLabels[order.status] ?? order.status}</Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent users */}
        <Card padding="none">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Novos usuários</h2>
            <a href="/admin/users" className="text-xs text-primary hover:underline">Ver todos</a>
          </div>
          <div className="divide-y divide-border">
            {MOCK_USERS.filter((u) => u.role === "student").slice(0, 4).map((user) => (
              <div key={user.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors">
                <Avatar src={user.avatar} name={user.name} size="sm" status="online" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
                  <p className="text-xs text-foreground-muted truncate">{user.email}</p>
                </div>
                <Badge variant={user.status === "active" ? "success" : "secondary"} dot>
                  {user.status === "active" ? "Ativo" : "Inativo"}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
