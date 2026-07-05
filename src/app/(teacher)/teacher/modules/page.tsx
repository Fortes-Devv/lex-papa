import Link from "next/link";
import { redirect } from "next/navigation";
import { Layers, BookOpen, Play, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDuration } from "@/lib/utils/cn";

export const dynamic = "force-dynamic";

export default async function TeacherModulesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Apenas os módulos onde ESTE professor é o responsável.
  const modules = await db.module.findMany({
    where: { instructorId: session.user.id },
    orderBy: [{ course: { product: { title: "asc" } } }, { order: "asc" }],
    include: {
      lessons: { select: { duration: true, status: true } },
      course: { include: { product: { select: { id: true, title: true, thumbnail: true, status: true } } } },
    },
  });

  // Agrupa por curso.
  type ModuleRow = (typeof modules)[number];
  const byCourse = new Map<string, { productId: string; title: string; thumbnail: string; published: boolean; modules: ModuleRow[] }>();
  for (const m of modules) {
    const p = m.course.product;
    if (!byCourse.has(p.id)) {
      byCourse.set(p.id, { productId: p.id, title: p.title, thumbnail: p.thumbnail, published: p.status === "published", modules: [] });
    }
    byCourse.get(p.id)!.modules.push(m);
  }
  const courses = Array.from(byCourse.values());

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="font-sans text-xl font-semibold text-foreground">Meus Módulos</h1>
        <p className="mt-0.5 text-sm text-foreground-muted">
          Os módulos que você leciona{courses.length > 0 ? ` — ${modules.length} módulo${modules.length !== 1 ? "s" : ""} em ${courses.length} curso${courses.length !== 1 ? "s" : ""}` : ""}.
        </p>
      </div>

      {courses.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-16 text-center text-sm text-foreground-muted">
          <Layers className="h-8 w-8 text-foreground-subtle" />
          Você ainda não foi associado a nenhum módulo.
          <span className="text-xs text-foreground-subtle">Quando o administrador vincular você a um módulo, ele aparece aqui.</span>
        </div>
      ) : (
        courses.map((course) => (
          <div key={course.productId} className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex items-center gap-3 border-b border-border bg-muted/30 p-4">
              <img src={course.thumbnail} alt={course.title} className="h-12 w-20 shrink-0 rounded object-cover" />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wider text-foreground-subtle">
                  <BookOpen className="h-3.5 w-3.5" /> Curso
                </p>
                <p className="truncate text-sm font-semibold text-foreground">{course.title}</p>
              </div>
              <Badge variant={course.published ? "success" : "secondary"} className="shrink-0">
                {course.published ? "Publicado" : "Rascunho"}
              </Badge>
              <Link href={`/course?productId=${course.productId}`} target="_blank" rel="noopener noreferrer" className="shrink-0">
                <Button size="sm" variant="ghost" leftIcon={<ExternalLink className="h-3.5 w-3.5" />}>Ver curso</Button>
              </Link>
            </div>

            <div className="divide-y divide-border">
              {course.modules.map((m) => {
                const totalDuration = m.lessons.reduce((s, l) => s + (l.duration ?? 0), 0);
                const publishedLessons = m.lessons.filter((l) => l.status === "published").length;
                return (
                  <div key={m.id} className="flex items-center gap-3 p-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-muted">
                      <Layers className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{m.title}</p>
                      <p className="text-xs text-foreground-muted">
                        {m.lessons.length} aula{m.lessons.length !== 1 ? "s" : ""}
                        {publishedLessons < m.lessons.length ? ` (${publishedLessons} publicada${publishedLessons !== 1 ? "s" : ""})` : ""}
                        {totalDuration > 0 ? ` · ${formatDuration(totalDuration)}` : ""}
                      </p>
                    </div>
                    <Badge variant={m.isPublished ? "success" : "secondary"} className="shrink-0">
                      {m.isPublished ? "Publicado" : "Rascunho"}
                    </Badge>
                    <Link href={`/teacher/content?courseId=${m.courseId}`} className="shrink-0">
                      <Button size="sm" variant="outline" leftIcon={<Play className="h-3.5 w-3.5" />}>Abrir</Button>
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
