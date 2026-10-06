import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { lessonFileAccessError, pdfDownloadResponse, recordDownload } from "@/lib/lesson-file";

/**
 * Baixa o PDF principal da aula pelo nosso servidor:
 * - só quem tem acesso baixa (matriculado, aula grátis/preview ou equipe);
 * - força o download com nome legível e não expõe a URL do Cloudinary.
 */
export async function GET(request: Request, props: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await props.params;
  const session = await auth();
  // Sem login (ex.: PDF grátis na página de venda): entra e volta para baixar.
  if (!session?.user) {
    const back = new URL(request.url).pathname;
    return NextResponse.redirect(new URL(`/login?callbackUrl=${encodeURIComponent(back)}`, request.url));
  }

  const denied = await lessonFileAccessError(session.user, lessonId);
  if (denied) return denied;

  const lesson = await db.lesson.findUnique({ where: { id: lessonId }, select: { pdfUrl: true, title: true } });
  if (!lesson?.pdfUrl) return new NextResponse("PDF não encontrado.", { status: 404 });
  // ?inline=1: abre na página (modo Vídeo + PDF); só o download conta em "PDFs baixados".
  const inline = new URL(request.url).searchParams.get("inline") === "1";
  if (!inline) await recordDownload(session.user, lessonId);
  return pdfDownloadResponse(lesson.pdfUrl, lesson.title, inline);
}
