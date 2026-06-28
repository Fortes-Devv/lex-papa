"use client";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { BarChart2, Users, BookOpen, DollarSign } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MOCK_REVENUE_DATA, MOCK_COURSE_ANALYTICS, MOCK_PRODUCTS } from "@/lib/mock/data";
import { formatCurrency, formatNumber } from "@/lib/utils/cn";

export default function AdminAnalyticsPage() {
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
            {[
              { label: "Total de alunos", value: "12.483", change: "+342 este mês", icon: <Users className="h-4 w-4" />, color: "text-primary" },
              { label: "Cursos publicados", value: "87", change: "+3 este mês", icon: <BookOpen className="h-4 w-4" />, color: "text-success" },
              { label: "Receita mensal", value: formatCurrency(48320), change: "+12.5%", icon: <DollarSign className="h-4 w-4" />, color: "text-success" },
              { label: "Taxa de conclusão", value: "64.2%", change: "-2.1% vs mês anterior", icon: <BarChart2 className="h-4 w-4" />, color: "text-warning" },
            ].map((item) => (
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
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={MOCK_REVENUE_DATA} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--foreground-muted))" }} tickLine={false} axisLine={false} interval={4} />
                  <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "hsl(var(--foreground-muted))" }} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "hsl(var(--foreground-muted))" }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="hsl(237 85% 65%)" strokeWidth={2} dot={false} name="Receita" />
                  <Line yAxisId="right" type="monotone" dataKey="orders" stroke="hsl(160 60% 42%)" strokeWidth={2} dot={false} name="Pedidos" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="courses" className="mt-4">
          <div className="space-y-4">
            {MOCK_COURSE_ANALYTICS.map((ca, i) => {
              const product = MOCK_PRODUCTS.find((p) => p.id === ca.productId);
              return (
                <Card key={ca.productId} className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">{i + 1}</div>
                  <img src={product?.thumbnail} className="h-12 w-20 rounded object-cover shrink-0" alt={product?.title} />
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="font-medium text-sm text-foreground truncate">{product?.title}</p>
                    <div className="flex items-center gap-4 text-xs text-foreground-muted flex-wrap">
                      <span>{formatNumber(ca.enrollments)} matrículas</span>
                      <span>{ca.completionRate.toFixed(1)}% conclusão</span>
                      <span>{ca.watchTimeHours.toLocaleString()}h assistidas</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-base font-bold text-foreground">{formatCurrency(ca.revenue)}</p>
                    <Badge variant="success">★ {ca.avgRating.toFixed(1)}</Badge>
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="revenue" className="mt-4">
          <Card padding="none">
            <div className="p-4 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">Receita x Reembolsos</h2>
            </div>
            <div className="p-4">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={MOCK_REVENUE_DATA.slice(-14)} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--foreground-muted))" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--foreground-muted))" }} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="revenue" fill="hsl(237 85% 65%)" radius={[4,4,0,0]} name="Receita" />
                  <Bar dataKey="refunds" fill="hsl(0 72% 56%)" radius={[4,4,0,0]} name="Reembolsos" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
