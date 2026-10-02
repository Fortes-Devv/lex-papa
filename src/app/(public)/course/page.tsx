import { notFound, permanentRedirect } from "next/navigation";
import { db } from "@/lib/db";

// URL antiga (/course?productId=... ou ?slug=...): redireciona (301) para /cursos/[slug].
// Sem parâmetros, mantém o comportamento antigo: abre o curso publicado mais recente.
export default async function LegacyCourseRedirect(props: { searchParams: Promise<{ slug?: string; productId?: string }> }) {
  const { slug, productId } = await props.searchParams;
  const product = await db.product.findFirst({
    where: {
      type: "course",
      status: "published",
      ...(slug ? { slug } : {}),
      ...(productId ? { id: productId } : {}),
    },
    orderBy: { createdAt: "desc" },
    select: { slug: true },
  });
  if (!product) notFound();
  permanentRedirect(`/cursos/${product.slug}`);
}
