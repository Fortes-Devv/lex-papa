// Importação do Google Drive (server action desta página) chama Drive e Bunny.
export const maxDuration = 60;
import Link from "next/link";
import { BookOpen, ExternalLink, MonitorPlay } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ModuleBoard } from "@/components/course/module-board/module-board";
import type { EditorModule } from "@/components/course/module-board/types";
import { loadEditorModules } from "@/lib/editor-modules";

export default async function TeacherContentPage(props: { searchParams: Promise<{ courseId?: string }> }) {
  const searchParams = await props.searchParams;
  const session = await auth();
  if (!session?.user) return null;

  const userId = session.user.id;

  // Cursos acessíveis: onde é dono (instrutor do produto) OU dono de algum módulo do curso.
  const products = await db.product.findMany({
    where: {
      type: "course",
      OR: [
        { instructors: { some: { id: userId } } },
        { course: { modules: { some: { module: { instructorId: userId } } } } },
      ],
    },
    orderBy: { createdAt: "desc" },
    include: { course: true, instructors: { select: { id: true } } },
  });

  const activeCourseId = searchParams.courseId ?? products.find((p) => p.course)?.course?.id;
  const activeProduct = products.find((p) => p.course?.id === activeCourseId);

  // Dono do curso vê todos os módulos (e monta o curso); professor de módulo vê só os dele.
  const isOwner = Boolean(activeProduct?.instructors.some((i) => i.id === userId));

  const editorModules: EditorModule[] = activeProduct && activeCourseId
    ? await loadEditorModules(activeCourseId, session.user, { onlyOwn: !isOwner })
    : [];

  return (
    <div className="space-y-5">
      {!isOwner && activeProduct && (
        <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-foreground-muted">Você gerencia apenas os seus módulos neste curso.</p>
      )}

      {products.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {products.map((p) => p.course && (
            <Link
              key={p.id}
              href={`/teacher/content?courseId=${p.course.id}`}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                p.course.id === activeCourseId
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-foreground-muted hover:border-primary/40"
              }`}
            >
              {p.title}
            </Link>
          ))}
        </div>
      )}

      {activeProduct?.course ? (
        <ModuleBoard
          header={{ courseId: activeProduct.course.id, productId: activeProduct.id, title: activeProduct.title, thumbnail: activeProduct.thumbnail, status: activeProduct.status, price: Number(activeProduct.price), enrolledCount: activeProduct.enrolledCount }}
          modules={editorModules}
          restricted={!isOwner}
          backHref="/teacher/courses"
          courseMenu={[
            { label: "Assistir como aluno", icon: <MonitorPlay className="h-3.5 w-3.5" />, href: `/preview/${activeProduct.course.id}` },
            ...(activeProduct.status === "published" ? [{ label: "Ver página de venda", icon: <ExternalLink className="h-3.5 w-3.5" />, href: `/cursos/${activeProduct.slug}` }] : []),
          ]}
        />
      ) : (
        <div className="py-16 text-center text-sm text-foreground-muted border border-dashed border-border rounded-lg flex flex-col items-center gap-2">
          <BookOpen className="h-8 w-8 text-foreground-subtle" />
          Você ainda não tem cursos. Crie um em &quot;Meus Cursos&quot;.
        </div>
      )}
    </div>
  );
}
