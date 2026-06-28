"use client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Users, DollarSign, BookOpen, Star, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { MOCK_PRODUCTS, MOCK_ENROLLMENTS, MOCK_REVENUE_DATA, MOCK_COURSE_ANALYTICS } from "@/lib/mock/data";
import { useCurrentUser } from "@/lib/store/hooks";
import { formatCurrency, formatRelativeDate } from "@/lib/utils/cn";

export default function TeacherDashboardPage() {
  const user = useCurrentUser();
  const myProducts = MOCK_PRODUCTS.filter((p) => p.instructorIds.includes(user.id));
  const myAnalytics = MOCK_COURSE_ANALYTICS.filter((a) => myProducts.some((p) => p.id === a.productId));
  const totalStudents = myAnalytics.reduce((s, a) => s + a.enrollments, 0);
  const totalRevenue = myAnalytics.reduce((s, a) => s + a.revenue, 0);
  const avgRating = myAnalytics.reduce((s, a) => s + a.avgRating, 0) / (myAnalytics.length || 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Avatar src={user.avatar} name={user.name} size="lg" />
        <div>
          <h1 className="text-xl font-semibold text-foreground">Olá, {user.name.split(" ")[0]}!</h1>
          <p className="text-sm text-foreground-muted">Aqui está o desempenho dos seus cursos.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Alunos totais", value: totalStudents.toLocaleString(), icon: <Users className="h-4 w-4" />, color: "text-primary" },
          { label: "Receita total", value: formatCurrency(totalRevenue), icon: <DollarSign className="h-4 w-4" />, color: "text-success" },
          { label: "Cursos publicados", value: myProducts.filter((p) => p.status === "published").length, icon: <BookOpen className="h-4 w-4" />, color: "text-info" },
          { label: "Avaliação média", value: avgRating.toFixed(1) + "★", icon: <Star className="h-4 w-4" />, color: "text-warning" },
        ].map((item) => (
          <Card key={item.label} className="flex items-center gap-3">
            <div className={`${item.color} shrink-0`}>{item.icon}</div>
            <div>
              <p className="text-xl font-bold text-foreground">{item.value}</p>
              <p className="text-xs text-foreground-muted">{item.label}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue chart */}
        <Card padding="none">
          <div className="p-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Receita — últimas 2 semanas</h2>
          </div>
          <div className="p-4">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={MOCK_REVENUE_DATA.slice(-14)} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: "hsl(var(--foreground-muted))" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 9, fill: "hsl(var(--foreground-muted))" }} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 11 }} formatter={(v: number) => [formatCurrency(v), "Receita"]} />
                <Bar dataKey="revenue" fill="hsl(160 60% 42%)" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* My courses performance */}
        <Card padding="none">
          <div className="p-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Performance dos cursos</h2>
          </div>
          <div className="divide-y divide-border">
            {myProducts.slice(0, 3).map((p) => {
              const analytics = myAnalytics.find((a) => a.productId === p.id);
              return (
                <div key={p.id} className="p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <img src={p.thumbnail} className="h-8 w-12 rounded object-cover shrink-0" alt={p.title} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{p.title}</p>
                      <p className="text-2xs text-foreground-muted">{analytics?.enrollments ?? 0} alunos · {formatCurrency(analytics?.revenue ?? 0)}</p>
                    </div>
                    <Badge variant="success">★ {analytics?.avgRating.toFixed(1) ?? "—"}</Badge>
                  </div>
                  <Progress value={analytics?.completionRate ?? 0} size="xs" label={`${analytics?.completionRate.toFixed(0) ?? 0}% conclusão`} showLabel />
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
