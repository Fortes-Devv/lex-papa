export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { CreateCourseDialog } from "@/components/course/create-course-dialog";
import { CourseCard, type CourseCardData } from "./course-card";

export default async function AdminCoursesPage(props: { searchParams: Promise<{ status?: string; q?: string }> }) {
  // Filtros vêm do painel contextual / chips (?status=published|draft, ?q=busca).
  const { status, q } = await props.searchParams;
  const products = await db.product.findMany({
    where: {
      type: "course",
      course: { isNot: null },
      ...(status === "published" || status === "draft" ? { status } : {}),
      ...(q?.trim() ? { title: { contains: q.trim(), mode: "insensitive" as const } } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { category: true, course: { include: { _count: { select: { modules: true } } } } },
  });

  const courses: CourseCardData[] = products.map((p) => {
    const course = p.course!;
    return {
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
      moduleCount: course._count.modules,
    };
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Cursos</h1>
          <p className="text-sm text-foreground-muted mt-0.5">{courses.length} curso{courses.length !== 1 ? "s" : ""}{q ? ` para "${q}"` : ""} · clique em um curso para organizar módulos e aulas</p>
        </div>
        <CreateCourseDialog openAfter="admin" />
      </div>

      <div className="space-y-3">
        {courses.map((course) => (
          <CourseCard key={course.productId} course={course} />
        ))}
        {courses.length === 0 && (
          <div className="py-16 text-center text-sm text-foreground-muted border border-dashed border-border rounded-lg">
            {status || q ? "Nenhum curso com esse filtro." : <>Nenhum curso ainda. Clique em &quot;Novo curso&quot; para criar o primeiro.</>}
          </div>
        )}
      </div>
    </div>
  );
}
