export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { CmsClient, type CmsPage, type CmsArticle } from "./cms-client";

export default async function AdminCmsPage() {
  const [pages, articles] = await Promise.all([
    db.cMSPage.findMany({ orderBy: { updatedAt: "desc" } }),
    db.article.findMany({ orderBy: { updatedAt: "desc" } }),
  ]);

  const pageDtos: CmsPage[] = pages.map((p) => ({
    id: p.id, title: p.title, slug: p.slug, content: p.content, status: p.status, updatedAt: p.updatedAt.toISOString(),
  }));
  const articleDtos: CmsArticle[] = articles.map((a) => ({
    id: a.id, title: a.title, slug: a.slug, excerpt: a.excerpt, content: a.content, status: a.status, views: a.views, updatedAt: a.updatedAt.toISOString(),
  }));

  return <CmsClient pages={pageDtos} articles={articleDtos} />;
}
