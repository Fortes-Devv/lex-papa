"use client";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card } from "@/components/ui/card";
import { MOCK_REVENUE_DATA, MOCK_COURSE_ANALYTICS, MOCK_PRODUCTS } from "@/lib/mock/data";
import { useCurrentUser } from "@/lib/store/hooks";
import { formatCurrency } from "@/lib/utils/cn";

export default function TeacherAnalyticsPage() {
  const user = useCurrentUser();
  const myProductIds = MOCK_PRODUCTS.filter((p) => p.instructorIds.includes(user.id)).map((p) => p.id);
  const analytics = MOCK_COURSE_ANALYTICS.filter((a) => myProductIds.includes(a.productId));

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
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={MOCK_REVENUE_DATA} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(160 60% 42%)" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="hsl(160 60% 42%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--foreground-muted))" }} tickLine={false} axisLine={false} interval={4} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--foreground-muted))" }} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }} formatter={(v: number) => [formatCurrency(v), "Receita"]} />
              <Area type="monotone" dataKey="revenue" stroke="hsl(160 60% 42%)" strokeWidth={2} fill="url(#grad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
