import Link from "next/link";
import { BookOpen, Users, DollarSign, BarChart2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CreateCourseDialog } from "@/components/course/create-course-dialog";
import { formatCurrency } from "@/lib/utils/cn";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function TeacherCoursesPage() {
  const session = await auth();
  if (!session?.user) return null;

  const products = await db.product.findMany({
    where: { type: "course", instructors: { some: { id: session.user.id } } },
    orderBy: { createdAt: "desc" },
    include: { course: true },
  });

  const stats = await Promise.all(
    products.map(async (p) => {
      const [revenueAgg, progressAgg] = await Promise.all([
        db.orderItem.aggregate({
          _sum: { totalPrice: true },
          where: { productId: p.id, order: { status: "paid" } },
        }),
        db.enrollment.aggregate({
          _avg: { progress: true },
          where: { productId: p.id },
        }),
      ]);
      return {
        revenue: Number(revenueAgg._sum.totalPrice ?? 0),
        completionRate: progressAgg._avg.progress ?? 0,
      };
    })
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Meus Cursos</h1>
          <p className="text-sm text-foreground-muted mt-0.5">{products.length} cursos criados</p>
        </div>
        <CreateCourseDialog />
      </div>

      <div className="space-y-3">
        {products.map((product, i) => (
          <Card key={product.id} padding="none" className="overflow-hidden hover:border-primary/30 transition-all group">
            <div className="flex items-start gap-4 p-4">
              <img src={product.thumbnail} className="h-20 w-32 rounded-lg object-cover shrink-0" alt={product.title} />
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-foreground text-sm leading-snug">{product.title}</h3>
                  <Badge variant={product.status === "published" ? "success" : "secondary"}>{product.status === "published" ? "Publicado" : "Rascunho"}</Badge>
                </div>
                <div className="grid grid-cols-4 gap-3 text-xs">
                  <div className="flex items-center gap-1 text-foreground-muted"><Users className="h-3 w-3" />{product.enrolledCount} alunos</div>
                  <div className="flex items-center gap-1 text-foreground-muted"><DollarSign className="h-3 w-3" />{formatCurrency(stats[i].revenue)}</div>
                  <div className="flex items-center gap-1 text-foreground-muted"><BarChart2 className="h-3 w-3" />{stats[i].completionRate.toFixed(0)}% conclusão</div>
                  <div className="flex items-center gap-1 text-warning">★ {product.rating > 0 ? product.rating.toFixed(1) : "—"}</div>
                </div>
                <Progress value={stats[i].completionRate} size="xs" />
              </div>
              {product.course && (
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <Link href={`/teacher/content?courseId=${product.course.id}`}>
                    <Button size="xs">Conteúdo</Button>
                  </Link>
                </div>
              )}
            </div>
          </Card>
        ))}
        {products.length === 0 && (
          <div className="py-16 text-center text-sm text-foreground-muted border border-dashed border-border rounded-lg flex flex-col items-center gap-2">
            <BookOpen className="h-8 w-8 text-foreground-subtle" />
            Você ainda não criou nenhum curso.
          </div>
        )}
      </div>
    </div>
  );
}
