import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { db } from "@/lib/db";
import { isEnrollmentActive, isStaffRole } from "@/lib/access";

// Quem pode baixar um arquivo de uma aula (PDF da aula ou material anexado):
// equipe sempre; aluno se a aula está publicada num módulo publicado em algum curso
// e ele tem matrícula válida nesse curso (ou a aula é grátis/preview).
// Retorna null se pode; senão, a resposta de erro já pronta.
export async function lessonFileAccessError(user: Session["user"], lessonId: string): Promise<NextResponse | null> {
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    include: { module: { include: { courses: { where: { isPublished: true }, select: { course: { select: { productId: true } } } } } } },
  });
  if (!lesson) return new NextResponse("Arquivo não encontrado.", { status: 404 });
  if (isStaffRole(user.role)) return null;

  const productIds = lesson.module.courses.map((c) => c.course.productId);
  if (lesson.status !== "published" || productIds.length === 0) return new NextResponse("Arquivo não encontrado.", { status: 404 });
  if (lesson.isFree || lesson.isPreview) return null;

  // Basta matrícula válida em qualquer curso que use o módulo.
  const enrollments = await db.enrollment.findMany({ where: { userId: user.id, productId: { in: productIds } } });
  return enrollments.some(isEnrollmentActive) ? null : new NextResponse("Você não tem acesso a este material.", { status: 403 });
}

// Busca o PDF no armazenamento e devolve como download, com nome legível
// (sem expor a URL do Cloudinary ao aluno).
export async function pdfDownloadResponse(url: string, fileTitle: string): Promise<NextResponse> {
  const upstream = await fetch(url);
  if (!upstream.ok || !upstream.body) {
    // 401 aqui = entrega de PDF bloqueada nas configurações do Cloudinary.
    return new NextResponse("Não foi possível obter o PDF no armazenamento.", { status: 502 });
  }
  // Remove acentos e caracteres inválidos para o nome do arquivo.
  const safeName =
    fileTitle
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
