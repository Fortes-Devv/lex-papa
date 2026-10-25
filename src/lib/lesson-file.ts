import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { db } from "@/lib/db";
import { isEnrollmentActive, isStaffRole } from "@/lib/access";
import { lockedUntil, releaseLabel, sectionReleaseDays } from "@/lib/release";
import { logSecurityEvent } from "@/lib/security";
import { stampPdf } from "@/lib/pdf-stamp";

// Quem pode baixar um arquivo de uma aula (PDF da aula ou material anexado):
// equipe sempre; aluno se a aula está publicada num módulo publicado em algum curso
// e ele tem matrícula válida nesse curso e o prazo de liberação (PDFs/módulo) já passou.
// Não existe aula grátis: sem compra, sem acesso.
// Retorna null se pode; senão, a resposta de erro já pronta.
export async function lessonFileAccessError(user: Session["user"], lessonId: string): Promise<NextResponse | null> {
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    include: { module: { include: { courses: { where: { isPublished: true }, select: { releaseAfterDays: true, section: true, course: { select: { productId: true, pdfReleaseDays: true } } } } } } },
  });
  if (!lesson) return new NextResponse("Arquivo não encontrado.", { status: 404 });
  if (isStaffRole(user.role)) return null;

  const links = lesson.module.courses;
  if (lesson.status !== "published" || links.length === 0) return new NextResponse("Arquivo não encontrado.", { status: 404 });

  // Matrícula válida em algum curso que usa o módulo E prazo de liberação daquele curso já passou.
  const enrollments = (await db.enrollment.findMany({ where: { userId: user.id, productId: { in: links.map((l) => l.course.productId) } } })).filter(isEnrollmentActive);
  if (enrollments.length === 0) {
    await logSecurityEvent({ type: "access_denied", severity: "medium", userId: user.id, sessionId: user.sid, resource: `pdf:${lessonId}`, reason: "PDF pedido sem matrícula ativa" });
    return new NextResponse("Você não tem acesso a este material.", { status: 403 });
  }
  let soonest: Date | null = null;
  for (const l of links) {
    const e = enrollments.find((x) => x.productId === l.course.productId);
    if (!e) continue;
    const until = lockedUntil(e.enrolledAt, Math.max(l.course.pdfReleaseDays, l.releaseAfterDays, sectionReleaseDays(l.section), lesson.dripDays ?? 0));
    if (!until) return null;
    if (!soonest || until < soonest) soonest = until;
  }
  return new NextResponse(`Este material será liberado em ${releaseLabel(soonest!)}.`, { status: 403 });
}

// Busca o PDF no armazenamento e devolve como download (ou para abrir na página,
// com inline), com nome legível e sem expor a URL do Cloudinary ao aluno.
// `stamp` (aluno): carimba o código da conta em cada página antes de entregar.
export async function pdfDownloadResponse(url: string, fileTitle: string, inline = false, stamp?: string): Promise<NextResponse> {
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
  let body: ReadableStream<Uint8Array> = upstream.body;
  if (stamp) {
    const stamped = await stampPdf(new Uint8Array(await upstream.arrayBuffer()), stamp);
    if (stamped) body = chunked(stamped);
    else body = (await fetch(url)).body ?? chunked(new Uint8Array());
  }
  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${safeName}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}

// Registra o download de um PDF (para "PDFs baixados" no Analytics).
// Só alunos contam; falha aqui nunca impede o download.
export async function recordDownload(user: Session["user"], lessonId: string, materialId?: string) {
  if (isStaffRole(user.role)) return;
  try {
    await db.downloadEvent.create({ data: { userId: user.id, lessonId, materialId: materialId ?? null } });
  } catch (err) {
    console.error("[downloads] não foi possível registrar:", err);
  }
}

// Entrega em pedaços (streaming): resposta grande não esbarra no limite de corpo da Vercel.
function chunked(bytes: Uint8Array, size = 512 * 1024): ReadableStream<Uint8Array> {
  let i = 0;
  return new ReadableStream({
    pull(controller) {
      if (i >= bytes.byteLength) { controller.close(); return; }
      controller.enqueue(bytes.subarray(i, i + size));
      i += size;
    },
  });
}
