import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Baixa o PDF da aula pelo nosso servidor:
 * - garante que só quem tem acesso baixa (matriculado, aula grátis/preview ou staff);
 * - força o download com nome de arquivo legível (Content-Disposition);
 * - evita expor a URL do Cloudinary direto para o aluno.
 */
export async function GET(_request: Request, { params }: { params: { lessonId: string } }) {
  const session = await auth();
  if (!session?.user) return new NextResponse("Faça login para baixar.", { status: 401 });

  const lesson = await db.lesson.findUnique({
    where: { id: params.lessonId },
    include: { module: { include: { course: { select: { productId: true } } } } },
  });
  if (!lesson?.pdfUrl) return new NextResponse("PDF não encontrado.", { status: 404 });

  const isStaff = ["admin", "moderator", "teacher"].includes(session.user.role);
  if (!isStaff && !lesson.isFree && !lesson.isPreview) {
    const enrollment = await db.enrollment.findUnique({
      where: { userId_productId: { userId: session.user.id, productId: lesson.module.course.productId } },
    });
    if (!enrollment) return new NextResponse("Você não tem acesso a este material.", { status: 403 });
  }

  const upstream = await fetch(lesson.pdfUrl);
  if (!upstream.ok || !upstream.body) {
    // 401 aqui = entrega de PDF bloqueada nas configurações do Cloudinary.
    return new NextResponse("Não foi possível obter o PDF no armazenamento.", { status: 502 });
  }

  // Remove acentos e caracteres inválidos para o nome do arquivo.
  const safeName =
    lesson.title
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^\w\s.-]/g, "")
      .trim() || "material";

  return new NextResponse(upstream.body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeName}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
