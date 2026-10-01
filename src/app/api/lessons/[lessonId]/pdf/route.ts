import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isEnrollmentActive, isStaffRole } from "@/lib/access";

/**
 * Baixa o PDF da aula pelo nosso servidor:
 * - garante que só quem tem acesso baixa (matriculado, aula grátis/preview ou staff);
 * - força o download com nome de arquivo legível (Content-Disposition);
 * - evita expor a URL do Cloudinary direto para o aluno.
 */
export async function GET(_request: Request, props: { params: Promise<{ lessonId: string }> }) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user) return new NextResponse("Faça login para baixar.", { status: 401 });

  const lesson = await db.lesson.findUnique({
    where: { id: params.lessonId },
    // Cursos onde o módulo está publicado (o mesmo módulo pode estar em vários cursos).
    include: { module: { include: { courses: { where: { isPublished: true }, select: { course: { select: { productId: true } } } } } } },
  });
  if (!lesson?.pdfUrl) return new NextResponse("PDF não encontrado.", { status: 404 });

  const isStaff = isStaffRole(session.user.role);
  const productIds = lesson.module.courses.map((c) => c.course.productId);
  if (!isStaff && (lesson.status !== "published" || productIds.length === 0)) {
    return new NextResponse("PDF não encontrado.", { status: 404 });
  }
  if (!isStaff && !lesson.isFree && !lesson.isPreview) {
    // Basta matrícula válida em qualquer curso que use o módulo.
    const enrollments = await db.enrollment.findMany({
      where: { userId: session.user.id, productId: { in: productIds } },
    });
    if (!enrollments.some(isEnrollmentActive)) return new NextResponse("Você não tem acesso a este material.", { status: 403 });
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
