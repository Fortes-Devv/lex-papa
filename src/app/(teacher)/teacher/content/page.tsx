import Link from "next/link";
import { BookOpen } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { CourseContentEditor, type EditorModule } from "@/components/course/course-content-editor";

export default async function TeacherContentPage({ searchParams }: { searchParams: { courseId?: string } }) {
  const session = await auth();
  if (!session?.user) return null;

  const userId = session.user.id;

  // Cursos acessíveis: onde é dono (instrutor do produto) OU dono de algum módulo.
  const products = await db.product.findMany({
    where: {
      type: "course",
      OR: [
        { instructors: { some: { id: userId } } },
        { course: { modules: { some: { instructorId: userId } } } },
      ],
    },
    orderBy: { createdAt: "desc" },
    include: { course: true, instructors: { select: { id: true } } },
  });

  const activeCourseId = searchParams.courseId ?? products.find((p) => p.course)?.course?.id;
  const activeProduct = products.find((p) => p.course?.id === activeCourseId);

  // Dono do curso vê todos os módulos; professor de módulo vê só os dele.
  const isOwner = Boolean(activeProduct?.instructors.some((i) => i.id === userId));

  const modules = activeCourseId
    ? await db.module.findMany({
        where: { courseId: activeCourseId, ...(isOwner ? {} : { instructorId: userId }) },
        orderBy: { order: "asc" },
        include: { lessons: { orderBy: { order: "asc" } }, instructor: { select: { name: true, avatar: true } } },
      })
    : [];

  const teachers = await db.user.findMany({
    where: { role: { in: ["teacher", "moderator", "admin"] }, status: "active" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const editorModules: EditorModule[] = modules.map((m) => ({
    id: m.id,
    title: m.title,
    order: m.order,
    isPublished: m.isPublished,
    instructorId: m.instructorId,
    instructorName: m.instructor?.name ?? null,
    instructorAvatar: m.instructor?.avatar ?? null,
    coverImage: m.coverImage,
    lessons: m.lessons.map((l) => ({
      id: l.id,
      title: l.title,
      type: l.type,
      status: l.status,
      order: l.order,
      duration: l.duration,
      videoUrl: l.videoUrl,
      videoPublicId: l.videoPublicId,
      pdfUrl: l.pdfUrl,
      description: l.description,
      isFree: l.isFree,
      isPreview: l.isPreview,
      completionCriteria: l.completionCriteria,
    })),
  }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Editor de Conteúdo</h1>
        <p className="text-sm text-foreground-muted mt-0.5">
          {activeProduct ? activeProduct.title : "Selecione um curso para editar"}
          {activeProduct && !isOwner && " · você gerencia apenas o seu módulo neste curso"}
        </p>
      </div>

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

      {activeCourseId ? (
        <CourseContentEditor courseId={activeCourseId} modules={editorModules} teachers={teachers} restricted={!isOwner} />
      ) : (
        <div className="py-16 text-center text-sm text-foreground-muted border border-dashed border-border rounded-lg flex flex-col items-center gap-2">
          <BookOpen className="h-8 w-8 text-foreground-subtle" />
          Você ainda não tem cursos. Crie um em &quot;Meus Cursos&quot;.
        </div>
      )}
    </div>
  );
}
