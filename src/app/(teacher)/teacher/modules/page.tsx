import Link from "next/link";
import { redirect } from "next/navigation";
import { Layers, BookOpen, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDuration } from "@/lib/utils/cn";

export const dynamic = "force-dynamic";

export default async function TeacherModulesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Módulos dos quais ESTE professor é o responsável. Um módulo pode estar em vários cursos.
  const modules = await db.module.findMany({
    where: { instructorId: session.user.id },
    orderBy: { title: "asc" },
    include: {
      lessons: { select: { duration: true, status: true } },
      courses: {
        orderBy: { addedAt: "asc" },
        include: { course: { include: { product: { select: { id: true, title: true, status: true } } } } },
      },
    },
  });

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="font-sans text-xl font-semibold text-foreground">Meus Módulos</h1>
        <p className="mt-0.5 text-sm text-foreground-muted">
          Os módulos que você leciona{modules.length > 0 ? ` — ${modules.length} módulo${modules.length !== 1 ? "s" : ""}` : ""}.
          {" "}O mesmo módulo pode estar em vários cursos: editar as aulas atualiza todos eles.
        </p>
      </div>

      {modules.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-16 text-center text-sm text-foreground-muted">
          <Layers className="h-8 w-8 text-foreground-subtle" />
          Você ainda não foi associado a nenhum módulo.
          <span className="text-xs text-foreground-subtle">Quando o administrador vincular você a um módulo, ele aparece aqui.</span>
        </div>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {modules.map((m) => {
            const totalDuration = m.lessons.reduce((s, l) => s + (l.duration ?? 0), 0);
            const publishedLessons = m.lessons.filter((l) => l.status === "published").length;
            const firstCourseId = m.courses[0]?.courseId;
            return (
              <div key={m.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  {m.coverImage ? (
                    <img src={m.coverImage} alt="" className="h-10 w-16 shrink-0 rounded object-cover" />
                  ) : (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-muted">
                      <Layers className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{m.title}</p>
                    <p className="text-xs text-foreground-muted">
                      {m.lessons.length} aula{m.lessons.length !== 1 ? "s" : ""}
                      {publishedLessons < m.lessons.length ? ` (${publishedLessons} publicada${publishedLessons !== 1 ? "s" : ""})` : ""}
                      {totalDuration > 0 ? ` · ${formatDuration(totalDuration)}` : ""}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {m.courses.length === 0 ? (
                        <Badge variant="secondary">Não está em nenhum curso</Badge>
                      ) : (
                        m.courses.map((cm) => (
                          <Link key={cm.id} href={`/teacher/content?courseId=${cm.courseId}`}>
                            <Badge variant={cm.isPublished ? "success" : "secondary"} className="gap-1">
                              <BookOpen className="h-3 w-3" /> {cm.course.product.title}
                            </Badge>
                          </Link>
                        ))
                      )}
                    </div>
                  </div>
                </div>
                {firstCourseId && (
                  <Link href={`/teacher/content?courseId=${firstCourseId}`} className="shrink-0">
                    <Button size="sm" variant="outline" leftIcon={<Play className="h-3.5 w-3.5" />}>Editar aulas</Button>
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
