import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { FavoritesClient, type FavoriteProduct } from "./favorites-client";

export default async function StudentFavoritesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const favorites = await db.favorite.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { product: { include: { category: true } } },
  });

  const items: FavoriteProduct[] = favorites.map((f) => ({
    id: f.product.id,
    title: f.product.title,
    thumbnail: f.product.thumbnail,
    price: Number(f.product.price),
    rating: f.product.rating,
    enrolledCount: f.product.enrolledCount,
    categoryName: f.product.category?.name ?? null,
  }));

  return <FavoritesClient favorites={items} />;
}
