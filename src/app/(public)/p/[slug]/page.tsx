export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";

export default async function CmsPageView({ params }: { params: { slug: string } }) {
  const page = await db.cMSPage.findUnique({ where: { slug: params.slug } });
  if (!page || page.status !== "published") notFound();

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-foreground mb-6">{page.title}</h1>
      <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-foreground" dangerouslySetInnerHTML={{ __html: page.content }} />
    </div>
  );
}
