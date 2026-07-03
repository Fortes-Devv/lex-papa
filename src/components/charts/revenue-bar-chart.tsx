"use client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { formatCurrency } from "@/lib/utils/cn";
import type { RevenueDataPoint } from "@/lib/types";

export function RevenueBarChart({ data, showRefunds = false, height = 250 }: { data: RevenueDataPoint[]; showRefunds?: boolean; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--foreground-muted))" }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 10, fill: "hsl(var(--foreground-muted))" }} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }} formatter={(v: number) => [formatCurrency(v), "Receita"]} />
        {showRefunds && <Legend wrapperStyle={{ fontSize: 12 }} />}
        <Bar dataKey="revenue" fill="hsl(237 85% 65%)" radius={[4, 4, 0, 0]} name="Receita" />
        {showRefunds && <Bar dataKey="refunds" fill="hsl(0 72% 56%)" radius={[4, 4, 0, 0]} name="Reembolsos" />}
      </BarChart>
    </ResponsiveContainer>
  );
}
