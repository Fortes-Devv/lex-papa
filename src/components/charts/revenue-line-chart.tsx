"use client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { RevenueDataPoint } from "@/lib/types";

export function RevenueLineChart({ data }: { data: RevenueDataPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--foreground-muted))" }} tickLine={false} axisLine={false} interval={4} />
        <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "hsl(var(--foreground-muted))" }} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "hsl(var(--foreground-muted))" }} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="hsl(237 85% 65%)" strokeWidth={2} dot={false} name="Receita" />
        <Line yAxisId="right" type="monotone" dataKey="orders" stroke="hsl(160 60% 42%)" strokeWidth={2} dot={false} name="Pedidos" />
      </LineChart>
    </ResponsiveContainer>
  );
}
