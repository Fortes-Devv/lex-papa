import { db } from "@/lib/db";
import { ProductsClient, type ProductDTO } from "./products-client";

export default async function AdminProductsPage() {
  const products = await db.product.findMany({
    orderBy: { createdAt: "desc" },
    include: { category: true },
  });

  const dtos: ProductDTO[] = products.map((p) => ({
    id: p.id,
    title: p.title,
    type: p.type,
    status: p.status,
    thumbnail: p.thumbnail,
    price: Number(p.price),
    comparePrice: p.comparePrice ? Number(p.comparePrice) : undefined,
    rating: p.rating,
    reviewCount: p.reviewCount,
    enrolledCount: p.enrolledCount,
    isFeatured: p.isFeatured,
    categoryName: p.category?.name,
  }));

  return <ProductsClient products={dtos} />;
}
