export const dynamic = "force-dynamic";
// Importação do Google Drive (server action desta página) chama Drive e Bunny.
export const maxDuration = 60;
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireArea } from "@/lib/auth-guards";
import { loadEditorModules } from "@/lib/editor-modules";
import { AdminCourseBoard } from "./course-board-client";

// Área de módulos do curso (admin): capas, preview das aulas e organização dos módulos.
export default async function AdminCoursePage(props: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await props.params;
  const session = await requireArea("admin");

  const course = await db.course.findUnique({
    where: { id: courseId },
    include: { product: { include: { category: true } } },
  });
  if (!course) notFound();
  const p = course.product;

  const [modules, teachers] = [
    await loadEditorModules(course.id, session.user),
    await db.user.findMany({
      where: { role: { in: ["teacher", "moderator", "admin"] }, status: "active" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ];

  return (
    <AdminCourseBoard
      header={{ courseId: course.id, productId: p.id, title: p.title, thumbnail: p.thumbnail, status: p.status, price: Number(p.price), enrolledCount: p.enrolledCount }}
      slug={p.slug}
      modules={modules}
      teachers={teachers}
      editInitial={{
        productId: p.id,
        title: p.title,
        shortDescription: p.shortDescription,
        description: p.description,
        price: Number(p.price),
        comparePrice: p.comparePrice ? Number(p.comparePrice) : undefined,
        categoryName: p.category?.name ?? "",
        level: p.level,
        thumbnail: p.thumbnail,
        heroColor: course.heroColor ?? "navy",
      }}
    />
  );
}
