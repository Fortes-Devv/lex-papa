import type { Session } from "next-auth";
import { db } from "@/lib/db";
import { resolveLessonVideoUrl } from "@/lib/bunny";
import type { EditorModule } from "@/components/course/course-content-editor";

type SessionUser = Pick<Session["user"], "id" | "role">;

// Módulos de um curso no formato do editor (CourseContentEditor), na ordem do curso.
// - canEdit: pode editar o conteúdo do módulo (dono do módulo ou admin/moderador).
// - usedIn: outros cursos que também usam o módulo (edição vale para todos).
// - previewUrl: assinada (Bunny com token), para a prévia no editor funcionar.
export async function loadEditorModules(courseId: string, user: SessionUser, opts: { onlyOwn?: boolean } = {}): Promise<EditorModule[]> {
  const isManager = user.role === "admin" || user.role === "moderator";
  const links = await db.courseModule.findMany({
    where: { courseId, ...(opts.onlyOwn ? { module: { instructorId: user.id } } : {}) },
    orderBy: { order: "asc" },
    include: {
      module: {
        include: {
          instructor: { select: { name: true, avatar: true } },
          lessons: { orderBy: { order: "asc" } },
          courses: { where: { courseId: { not: courseId } }, select: { course: { select: { product: { select: { title: true } } } } } },
        },
      },
    },
  });

  return links.map(({ module: m, order, isPublished }) => ({
    id: m.id,
    title: m.title,
    order,
    isPublished,
    instructorId: m.instructorId,
    instructorName: m.instructor?.name ?? null,
    instructorAvatar: m.instructor?.avatar ?? null,
    coverImage: m.coverImage,
    canEdit: isManager || m.instructorId === user.id,
    usedIn: m.courses.map((c) => c.course.product.title),
    lessons: m.lessons.map((l) => ({
      id: l.id,
      title: l.title,
      type: l.type,
      status: l.status,
      order: l.order,
      duration: l.duration,
      // URL base (é o que o formulário devolve ao salvar — nunca gravar a assinada).
      videoUrl: l.videoUrl,
      previewUrl: resolveLessonVideoUrl(l),
      videoPublicId: l.videoPublicId,
      pdfUrl: l.pdfUrl,
      description: l.description,
      isFree: l.isFree,
      isPreview: l.isPreview,
      completionCriteria: l.completionCriteria,
    })),
  }));
}
