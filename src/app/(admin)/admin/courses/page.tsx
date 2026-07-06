export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { CreateCourseDialog } from "@/components/course/create-course-dialog";
import { CourseCard, type CourseCardData } from "./course-card";

export default async function AdminCoursesPage() {
  const products = await db.product.findMany({
    where: { type: "course" },
    orderBy: { createdAt: "desc" },
    include: {
      category: true,
      course: {
        include: {
          modules: {
            orderBy: { order: "asc" },
            include: { lessons: { orderBy: { order: "asc" } }, instructor: { select: { name: true, avatar: true } } },
          },
        },
      },
    },
  });

  const teachers = await db.user.findMany({
    where: { role: { in: ["teacher", "moderator", "admin"] }, status: "active" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const courses: CourseCardData[] = products
    .filter((p) => p.course)
    .map((p) => ({
      productId: p.id,
      courseId: p.course!.id,
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
      totalLessons: p.course!.totalLessons,
      totalDuration: p.course!.totalDuration,
      heroColor: p.course!.heroColor ?? "navy",
      modules: p.course!.modules.map((m) => ({
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
          description: l.description,
          isFree: l.isFree,
          isPreview: l.isPreview,
          completionCriteria: l.completionCriteria,
        })),
      })),
    }));

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
