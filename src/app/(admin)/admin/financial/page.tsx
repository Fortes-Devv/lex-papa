import { DollarSign, TrendingUp, RefreshCcw, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RevenueBarChart } from "@/components/charts/revenue-bar-chart";
import { PaymentMethodPieChart } from "@/components/charts/payment-method-pie-chart";
import { db } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/utils/cn";
import { getFinancialSummary, getPaymentMethodBreakdown, getRevenueSeries } from "@/lib/analytics";

const summaryStyles = {
  success: { wrap: "bg-success-muted text-success" },
  warning: { wrap: "bg-warning-muted text-warning" },
  destructive: { wrap: "bg-destructive-muted text-destructive" },
} as const;

export default async function AdminFinancialPage() {
  const [summary, paymentBreakdown, revenueSeries, coupons] = await Promise.all([
    getFinancialSummary(),
    getPaymentMethodBreakdown(),
    getRevenueSeries(14),
    db.coupon.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  const cards = [
    { label: "Receita confirmada", value: summary.confirmed, icon: <DollarSign className="h-4 w-4" />, variant: "success" as const },
    { label: "Pendente", value: summary.pending, icon: <TrendingUp className="h-4 w-4" />, variant: "warning" as const },
    { label: "Reembolsos", value: summary.refunded, icon: <RefreshCcw className="h-4 w-4" />, variant: "destructive" as const },
    { label: "Chargebacks", value: summary.chargebacks, icon: <AlertTriangle className="h-4 w-4" />, variant: "destructive" as const },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Financeiro</h1>
        <p className="text-sm text-foreground-muted mt-0.5">Visão geral de receitas, reembolsos e pagamentos</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((item) => (
          <Card key={item.label} className="flex items-center gap-4">
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${summaryStyles[item.variant].wrap}`}>
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
              <h2 className="text-sm font-semibold text-foreground">Receita diária — últimos 14 dias</h2>
            </div>
            <div className="p-5">
              <RevenueBarChart data={revenueSeries} />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="methods" className="mt-4">
          <Card>
            {paymentBreakdown.length === 0 ? (
              <p className="text-sm text-foreground-muted text-center py-8">Nenhum pagamento confirmado ainda.</p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <PaymentMethodPieChart data={paymentBreakdown} />
                <div className="space-y-3">
                  {paymentBreakdown.map((item) => (
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
            )}
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
                {coupons.map((coupon) => (
                  <tr key={coupon.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-foreground">{coupon.code}</td>
                    <td className="px-4 py-3 text-foreground-muted">{coupon.type === "percentage" ? "Percentual" : "Fixo"}</td>
                    <td className="px-4 py-3 text-foreground">{coupon.type === "percentage" ? `${Number(coupon.value)}%` : formatCurrency(Number(coupon.value))}</td>
                    <td className="px-4 py-3 text-foreground-muted">{coupon.usedCount}{coupon.maxUses ? `/${coupon.maxUses}` : ""}</td>
                    <td className="px-4 py-3 text-foreground-muted">{coupon.expiresAt ? formatDate(coupon.expiresAt.toISOString()) : "—"}</td>
                    <td className="px-4 py-3"><Badge variant={coupon.isActive ? "success" : "secondary"} dot>{coupon.isActive ? "Ativo" : "Inativo"}</Badge></td>
                  </tr>
                ))}
                {coupons.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-foreground-muted">Nenhum cupom cadastrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
