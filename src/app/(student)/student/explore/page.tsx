export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isEnrollmentActive } from "@/lib/access";
import { daysUntil } from "@/lib/student-area";
import { ExploreClient, type ExploreProduct, type ExploreCategory } from "./explore-client";

// Cursos (modelo 7f): vitrine com capas, filtros por categoria e compra; "você tem" fica marcado.
export default async function StudentExplorePage() {
  const session = await auth();
  const userId = session?.user?.id;

  const products = await db.product.findMany({
    where: { type: "course", status: "published" },
    orderBy: { enrolledCount: "desc" },
    include: { category: true, course: { select: { id: true, totalLessons: true, totalDuration: true, _count: { select: { modules: true } } } } },
  });
  const categories = await db.category.findMany({ where: { isActive: true }, orderBy: { order: "asc" } });
  const favorites = userId ? await db.favorite.findMany({ where: { userId }, select: { productId: true } }) : [];
  const enrollments = userId ? await db.enrollment.findMany({ where: { userId }, select: { productId: true, progress: true, status: true, expiresAt: true } }) : [];

  const favoriteIds = new Set(favorites.map((f) => f.productId));
  const owned = new Map(enrollments.filter(isEnrollmentActive).map((e) => [e.productId, e.progress]));

  const dtos: ExploreProduct[] = products.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    description: p.shortDescription || p.description,
    thumbnail: p.thumbnail,
    price: Number(p.price),
    comparePrice: p.comparePrice ? Number(p.comparePrice) : null,
    rating: p.rating,
    enrolledCount: p.enrolledCount,
    isFeatured: p.isFeatured,
    categoryId: p.categoryId,
    categoryName: p.category?.name ?? null,
    isFavorite: favoriteIds.has(p.id),
    courseId: p.course?.id ?? null,
    modules: p.course?._count.modules ?? 0,
    lessons: p.course?.totalLessons ?? 0,
    seconds: p.course?.totalDuration ?? 0,
    examIn: daysUntil(p.examDate),
    examDate: p.examDate?.toISOString() ?? null,
    owned: owned.has(p.id),
    progress: owned.get(p.id) ?? 0,
  }));

  const cats: ExploreCategory[] = categories.map((c) => ({ id: c.id, name: c.name }));
  return <ExploreClient products={dtos} categories={cats} loggedIn={!!userId} />;
}
