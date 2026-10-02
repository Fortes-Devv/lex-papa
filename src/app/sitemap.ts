import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { siteUrl } from "@/lib/site-url";

// Regera no máximo a cada hora (cursos novos entram sozinhos).
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl() ?? "https://lexcursos.site";
  const courses = await db.product.findMany({
    where: { type: "course", status: "published" },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });
  return [
    ...courses.map((c) => ({ url: `${base}/cursos/${c.slug}`, lastModified: c.updatedAt, changeFrequency: "weekly" as const, priority: 0.9 })),
    { url: `${base}/termos`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/privacidade`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
