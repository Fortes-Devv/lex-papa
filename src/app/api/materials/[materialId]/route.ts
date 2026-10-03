import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { lessonFileAccessError, pdfDownloadResponse, recordDownload } from "@/lib/lesson-file";

/** Baixa um material (PDF) anexado a uma aula, com a mesma regra de acesso da aula. */
export async function GET(request: Request, props: { params: Promise<{ materialId: string }> }) {
  const { materialId } = await props.params;
  const session = await auth();
  if (!session?.user) return new NextResponse("Faça login para baixar.", { status: 401 });

  const material = await db.material.findUnique({ where: { id: materialId }, select: { lessonId: true, url: true, title: true, type: true } });
  if (!material || material.type !== "pdf") return new NextResponse("Material não encontrado.", { status: 404 });

  const denied = await lessonFileAccessError(session.user, material.lessonId);
  if (denied) return denied;

  // ?inline=1: abre na página (modo Vídeo + PDF); só o download conta em "PDFs baixados".
  const inline = new URL(request.url).searchParams.get("inline") === "1";
  if (!inline) await recordDownload(session.user, material.lessonId, materialId);
  return pdfDownloadResponse(material.url, material.title, inline);
}
