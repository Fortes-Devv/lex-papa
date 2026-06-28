"use client";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { DollarSign, TrendingUp, RefreshCcw, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MOCK_REVENUE_DATA, MOCK_ORDERS, MOCK_COUPONS } from "@/lib/mock/data";
import { formatCurrency, formatDate } from "@/lib/utils/cn";

const pieData = [
  { name: "Cartão de Crédito", value: 58, color: "#5E6AD2" },
  { name: "PIX", value: 32, color: "#10B981" },
  { name: "Boleto", value: 10, color: "#F59E0B" },
];

export default function AdminFinancialPage() {
  const totalRevenue = MOCK_ORDERS.filter((o) => o.status === "paid").reduce((s, o) => s + o.total, 0);
  const totalRefunds = MOCK_ORDERS.filter((o) => o.status === "refunded").reduce((s, o) => s + o.total, 0);
  const pendingAmount = MOCK_ORDERS.filter((o) => o.status === "pending").reduce((s, o) => s + o.total, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Financeiro</h1>
        <p className="text-sm text-foreground-muted mt-0.5">Visão geral de receitas, reembolsos e pagamentos</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Receita confirmada", value: totalRevenue, icon: <DollarSign className="h-4 w-4" />, variant: "success" as const },
          { label: "Pendente", value: pendingAmount, icon: <TrendingUp className="h-4 w-4" />, variant: "warning" as const },
          { label: "Reembolsos", value: totalRefunds, icon: <RefreshCcw className="h-4 w-4" />, variant: "destructive" as const },
          { label: "Chargebacks", value: 0, icon: <AlertTriangle className="h-4 w-4" />, variant: "destructive" as const },
        ].map((item) => (
          <Card key={item.label} className="flex items-center gap-4">
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center bg-${item.variant}-muted text-${item.variant} shrink-0`}>
              {item.icon}
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(item.value)}</p>
              <p className="text-xs text-foreground-muted">{item.label}</p>
            </div>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="revenue">
        <TabsList>
          <TabsTrigger value="revenue">Receita</TabsTrigger>
          <TabsTrigger value="methods">Formas de pagamento</TabsTrigger>
          <TabsTrigger value="coupons">Cupons</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="mt-4">
          <Card padding="none">
            <div className="p-5 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">Receita diária — últimos 30 dias</h2>
            </div>
            <div className="p-5">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={MOCK_REVENUE_DATA.slice(-14)} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--foreground-muted))" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--foreground-muted))" }} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }} formatter={(v: number) => [formatCurrency(v), "Receita"]} />
                  <Bar dataKey="revenue" fill="hsl(237 85% 65%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="methods" className="mt-4">
          <Card>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => [`${v}%`, ""]} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3">
                {pieData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
                      <span className="text-sm text-foreground">{item.name}</span>
                    </div>
                    <span className="font-semibold text-foreground">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="coupons" className="mt-4">
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr>
                  {["Código", "Tipo", "Desconto", "Usos", "Expira", "Status"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-foreground-muted uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {MOCK_COUPONS.map((coupon) => (
                  <tr key={coupon.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-foreground">{coupon.code}</td>
                    <td className="px-4 py-3 text-foreground-muted">{coupon.type === "percentage" ? "Percentual" : "Fixo"}</td>
                    <td className="px-4 py-3 text-foreground">{coupon.type === "percentage" ? `${coupon.value}%` : formatCurrency(coupon.value)}</td>
                    <td className="px-4 py-3 text-foreground-muted">{coupon.usedCount}{coupon.maxUses ? `/${coupon.maxUses}` : ""}</td>
                    <td className="px-4 py-3 text-foreground-muted">{coupon.expiresAt ? formatDate(coupon.expiresAt) : "—"}</td>
                    <td className="px-4 py-3"><Badge variant={coupon.isActive ? "success" : "secondary"} dot>{coupon.isActive ? "Ativo" : "Inativo"}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
