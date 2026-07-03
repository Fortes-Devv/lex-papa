export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils/cn";

export default async function BlogArticleView({ params }: { params: { slug: string } }) {
  const article = await db.article.findUnique({ where: { slug: params.slug } });
  if (!article || article.status !== "published") notFound();

  // Incrementa contador de visualizações (best-effort).
  db.article.update({ where: { id: article.id }, data: { views: { increment: 1 } } }).catch(() => {});

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      {article.thumbnail && <img src={article.thumbnail} alt={article.title} className="w-full aspect-video object-cover rounded-lg mb-6" />}
      <h1 className="text-3xl font-bold text-foreground mb-2">{article.title}</h1>
      {article.publishedAt && <p className="text-sm text-foreground-muted mb-6">{formatDate(article.publishedAt.toISOString())}</p>}
      <p className="text-lg text-foreground-muted mb-6">{article.excerpt}</p>
      <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-foreground" dangerouslySetInnerHTML={{ __html: article.content }} />
    </div>
  );
}
