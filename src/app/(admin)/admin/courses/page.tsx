export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { requireArea } from "@/lib/auth-guards";
import { loadEditorModules } from "@/lib/editor-modules";
import { CreateCourseDialog } from "@/components/course/create-course-dialog";
import { CourseCard, type CourseCardData } from "./course-card";

export default async function AdminCoursesPage() {
  const session = await requireArea("admin");

  const products = await db.product.findMany({
    where: { type: "course", course: { isNot: null } },
    orderBy: { createdAt: "desc" },
    include: { category: true, course: true },
  });

  const teachers = await db.user.findMany({
    where: { role: { in: ["teacher", "moderator", "admin"] }, status: "active" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  // Sequencial (driver Neon não gosta de muitas queries em paralelo).
  const courses: CourseCardData[] = [];
  for (const p of products) {
    const course = p.course!;
    courses.push({
      productId: p.id,
      courseId: course.id,
      title: p.title,
      thumbnail: p.thumbnail,
      status: p.status,
      price: Number(p.price),
      comparePrice: p.comparePrice ? Number(p.comparePrice) : undefined,
      shortDescription: p.shortDescription,
      description: p.description,
      categoryName: p.category?.name ?? "",
      level: p.level,
      enrolledCount: p.enrolledCount,
      totalLessons: course.totalLessons,
      totalDuration: course.totalDuration,
      heroColor: course.heroColor ?? "navy",
      modules: await loadEditorModules(course.id, session.user),
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Cursos</h1>
          <p className="text-sm text-foreground-muted mt-0.5">{courses.length} cursos cadastrados</p>
        </div>
        <CreateCourseDialog />
      </div>

      <div className="space-y-3">
        {courses.map((course) => (
          <CourseCard key={course.productId} course={course} teachers={teachers} />
        ))}
        {courses.length === 0 && (
          <div className="py-16 text-center text-sm text-foreground-muted border border-dashed border-border rounded-lg">
            Nenhum curso ainda. Clique em &quot;Novo curso&quot; para criar o primeiro.
          </div>
        )}
      </div>
    </div>
  );
}
