"use client";
import Link from "next/link";
import { Plus, BookOpen, Users, DollarSign, BarChart2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/toast";
import { MOCK_PRODUCTS, MOCK_COURSE_ANALYTICS } from "@/lib/mock/data";
import { useCurrentUser } from "@/lib/store/hooks";
import { formatCurrency } from "@/lib/utils/cn";

export default function TeacherCoursesPage() {
  const user = useCurrentUser();
  const { success } = useToast();
  const myProducts = MOCK_PRODUCTS.filter((p) => p.instructorIds.includes(user.id));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Meus Cursos</h1>
          <p className="text-sm text-foreground-muted mt-0.5">{myProducts.length} cursos criados</p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => success("Novo curso criado!")}>Novo curso</Button>
      </div>

      <div className="space-y-3">
        {myProducts.map((product) => {
          const analytics = MOCK_COURSE_ANALYTICS.find((a) => a.productId === product.id);
          return (
            <Card key={product.id} padding="none" className="overflow-hidden hover:border-primary/30 transition-all group">
              <div className="flex items-start gap-4 p-4">
                <img src={product.thumbnail} className="h-20 w-32 rounded-lg object-cover shrink-0" alt={product.title} />
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-foreground text-sm leading-snug">{product.title}</h3>
                    <Badge variant={product.status === "published" ? "success" : "secondary"}>{product.status === "published" ? "Publicado" : "Rascunho"}</Badge>
                  </div>
                  <div className="grid grid-cols-4 gap-3 text-xs">
                    <div className="flex items-center gap-1 text-foreground-muted"><Users className="h-3 w-3" />{analytics?.enrollments ?? 0} alunos</div>
                    <div className="flex items-center gap-1 text-foreground-muted"><DollarSign className="h-3 w-3" />{formatCurrency(analytics?.revenue ?? 0)}</div>
                    <div className="flex items-center gap-1 text-foreground-muted"><BarChart2 className="h-3 w-3" />{analytics?.completionRate.toFixed(0) ?? 0}% conclusão</div>
                    <div className="flex items-center gap-1 text-warning">★ {analytics?.avgRating.toFixed(1) ?? "—"}</div>
                  </div>
                  <Progress value={analytics?.completionRate ?? 0} size="xs" />
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <Link href="/teacher/content">
                    <Button size="xs" variant="outline">Editar</Button>
                  </Link>
                  <Link href="/teacher/content">
                    <Button size="xs">Conteúdo</Button>
                  </Link>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
