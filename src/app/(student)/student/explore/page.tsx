import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ExploreClient, type ExploreProduct, type ExploreCategory } from "./explore-client";

export default async function StudentExplorePage() {
  const session = await auth();

  const [products, categories, favorites] = await Promise.all([
    db.product.findMany({
      where: { type: "course", status: "published" },
      orderBy: { enrolledCount: "desc" },
      include: { category: true },
    }),
    db.category.findMany({ where: { isActive: true }, orderBy: { order: "asc" } }),
    session?.user ? db.favorite.findMany({ where: { userId: session.user.id }, select: { productId: true } }) : Promise.resolve([]),
  ]);

  const favoriteIds = new Set(favorites.map((f) => f.productId));

  const dtos: ExploreProduct[] = products.map((p) => ({
    id: p.id,
    title: p.title,
    description: p.description,
    thumbnail: p.thumbnail,
    price: Number(p.price),
    rating: p.rating,
    enrolledCount: p.enrolledCount,
    isFeatured: p.isFeatured,
    categoryId: p.categoryId,
    categoryName: p.category?.name ?? null,
    isFavorite: favoriteIds.has(p.id),
  }));

  const cats: ExploreCategory[] = categories.map((c) => ({ id: c.id, name: c.name }));

  return <ExploreClient products={dtos} categories={cats} loggedIn={!!session?.user} />;
}
