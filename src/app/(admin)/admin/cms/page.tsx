export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { requireArea } from "@/lib/auth-guards";
import { CmsClient, type CmsPage, type CmsArticle } from "./cms-client";

export default async function AdminCmsPage() {
  // Edição do CMS é só para admin (HTML publicado no site).
  const session = await requireArea("admin");
  if (session.user.role !== "admin") {
    return (
      <div className="py-16 text-center text-sm text-foreground-muted border border-dashed border-border rounded-lg">
        Somente administradores podem editar páginas e artigos do site.
      </div>
    );
  }

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
