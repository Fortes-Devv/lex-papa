import { redirect } from "next/navigation";
import { Users, DollarSign, BookOpen, Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { RevenueBarChart } from "@/components/charts/revenue-bar-chart";
import { auth } from "@/lib/auth";
import { getTeacherOverview, getTeacherRevenueSeries, getCourseAnalyticsList } from "@/lib/analytics";
import { formatCurrency } from "@/lib/utils/cn";

export default async function TeacherDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const teacherId = session.user.id;

  const [overview, revenueSeries, courses] = await Promise.all([
    getTeacherOverview(teacherId),
    getTeacherRevenueSeries(teacherId, 14),
    getCourseAnalyticsList(3, teacherId),
  ]);

  const stats = [
    { label: "Alunos totais", value: overview.totalStudents.toLocaleString("pt-BR"), icon: <Users className="h-4 w-4" />, color: "text-primary" },
    { label: "Receita total", value: formatCurrency(overview.totalRevenue), icon: <DollarSign className="h-4 w-4" />, color: "text-success" },
    { label: "Cursos publicados", value: overview.publishedCourses, icon: <BookOpen className="h-4 w-4" />, color: "text-info" },
    { label: "Avaliação média", value: overview.avgRating > 0 ? overview.avgRating.toFixed(1) + "★" : "—", icon: <Star className="h-4 w-4" />, color: "text-warning" },
  ];

  return (
    <div className="space-y-6">
      <div data-aos="fade-up" className="flex items-center gap-4">
        <Avatar src={session.user.image ?? undefined} name={session.user.name ?? ""} size="lg" />
        <div>
          <h1 className="text-xl font-semibold text-foreground">Olá, {(session.user.name ?? "").split(" ")[0]}!</h1>
          <p className="text-sm text-foreground-muted">Aqui está o desempenho dos seus cursos.</p>
        </div>
      </div>

      <div data-aos="fade-up" data-aos-delay="80" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((item) => (
          <Card key={item.label} className="flex items-center gap-3">
            <div className={`${item.color} shrink-0`}>{item.icon}</div>
            <div>
              <p className="text-xl font-bold text-foreground">{item.value}</p>
              <p className="text-xs text-foreground-muted">{item.label}</p>
            </div>
          </Card>
        ))}
      </div>

      <div data-aos="fade-up" data-aos-delay="160" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card padding="none">
          <div className="p-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Receita — últimas 2 semanas</h2>
          </div>
          <div className="p-4">
            <RevenueBarChart data={revenueSeries} height={180} />
          </div>
        </Card>

        <Card padding="none">
          <div className="p-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Performance dos cursos</h2>
          </div>
          <div className="divide-y divide-border">
            {courses.length === 0 && <p className="p-4 text-xs text-foreground-muted text-center">Você ainda não tem cursos.</p>}
            {courses.map((c) => (
              <div key={c.productId} className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <img src={c.thumbnail} className="h-8 w-12 rounded object-cover shrink-0" alt={c.title} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{c.title}</p>
                    <p className="text-2xs text-foreground-muted">{c.enrollments} alunos · {formatCurrency(c.revenue)}</p>
                  </div>
                  {c.avgRating > 0 && <Badge variant="success">★ {c.avgRating.toFixed(1)}</Badge>}
                </div>
                <Progress value={c.completionRate} size="xs" label={`${c.completionRate.toFixed(0)}% conclusão`} showLabel />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
