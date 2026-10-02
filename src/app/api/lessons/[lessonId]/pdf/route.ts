import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { lessonFileAccessError, pdfDownloadResponse } from "@/lib/lesson-file";

/**
 * Baixa o PDF principal da aula pelo nosso servidor:
 * - só quem tem acesso baixa (matriculado, aula grátis/preview ou equipe);
 * - força o download com nome legível e não expõe a URL do Cloudinary.
 */
export async function GET(_request: Request, props: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await props.params;
  const session = await auth();
  if (!session?.user) return new NextResponse("Faça login para baixar.", { status: 401 });

  const denied = await lessonFileAccessError(session.user, lessonId);
  if (denied) return denied;

  const lesson = await db.lesson.findUnique({ where: { id: lessonId }, select: { pdfUrl: true, title: true } });
  if (!lesson?.pdfUrl) return new NextResponse("PDF não encontrado.", { status: 404 });
  return pdfDownloadResponse(lesson.pdfUrl, lesson.title);
}
