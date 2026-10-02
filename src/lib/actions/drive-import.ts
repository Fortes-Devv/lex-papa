"use server";

import { requireStaff } from "@/lib/auth-guards";
import { db } from "@/lib/db";
import { canEditModule, NOT_ALLOWED } from "@/lib/course-permissions";
import { fetchBunnyVideoFromUrl, getBunnyPlaybackUrl, isBunnyConfigured } from "@/lib/bunny";
import { checkDriveVideo, driveDownloadUrl, listDriveFolderVideos, parseDriveLink, titleFromFileName } from "@/lib/google-drive";
import { recalcTotalsForModule } from "@/lib/course-totals";
import { logAudit } from "@/lib/audit";

const MAX_PER_IMPORT = 60;
const FILE_ID = /^[\w-]{10,}$/;

export interface DriveImportItem { fileId: string; title: string }

// Passo 1: lê o link (vídeo ou pasta) e devolve a lista de aulas que serão criadas.
export async function previewDriveImport(moduleId: string, link: string) {
  const session = await requireStaff();
  if (!(await canEditModule(session.user, moduleId))) return NOT_ALLOWED;
  if (!isBunnyConfigured()) return { success: false as const, error: "Bunny Stream não configurado." };
  const parsed = parseDriveLink(link);
  if (!parsed) return { success: false as const, error: "Link do Google Drive inválido." };
  try {
    if (parsed.kind === "file") {
      const { name } = await checkDriveVideo(parsed.id);
      return { success: true as const, kind: "file" as const, items: [{ fileId: parsed.id, title: titleFromFileName(name ?? "Aula") }] };
    }
    const videos = await listDriveFolderVideos(parsed.id);
    if (videos.length === 0) return { success: false as const, error: "Nenhum vídeo nesta pasta (ou ela não está compartilhada por link)." };
    return {
      success: true as const,
      kind: "folder" as const,
      truncated: videos.length > MAX_PER_IMPORT,
      items: videos.slice(0, MAX_PER_IMPORT).map((v) => ({ fileId: v.id, title: titleFromFileName(v.name) })),
    };
  } catch (err) {
    return { success: false as const, error: err instanceof Error ? err.message : "Não foi possível ler o link." };
  }
}

// Passo 2 (uma chamada por vídeo): o Bunny baixa direto do Drive e a aula é criada no fim do módulo.
export async function importDriveVideo(moduleId: string, item: DriveImportItem, publish: boolean) {
  const session = await requireStaff();
  if (!(await canEditModule(session.user, moduleId))) return NOT_ALLOWED;
  if (!FILE_ID.test(item.fileId)) return { success: false as const, error: "Arquivo inválido." };
  const title = item.title.trim().slice(0, 200) || "Aula";
  // Cada etapa com nome: o erro mostra onde parou (e o tempo vai para os logs da Vercel).
  const t0 = Date.now();
  let step = "Drive";
  try {
    await checkDriveVideo(item.fileId);
    step = "Bunny";
    const { videoId } = await fetchBunnyVideoFromUrl(driveDownloadUrl(item.fileId), title);
    step = "Banco";
    const last = await db.lesson.findFirst({ where: { moduleId }, orderBy: { order: "desc" }, select: { order: true } });
    const lesson = await db.lesson.create({
      data: {
        moduleId,
        title,
        type: "video",
        status: publish ? "published" : "draft",
        order: (last?.order ?? 0) + 1,
        videoProvider: "bunny",
        videoPublicId: videoId,
        videoUrl: getBunnyPlaybackUrl(videoId),
      },
    });
    await recalcTotalsForModule(moduleId);
    await logAudit({ actorId: session.user.id, action: "lesson.imported_drive", resourceType: "lesson", resourceId: lesson.id, metadata: { title, driveFileId: item.fileId } });
    // Sem revalidatePath aqui: recarregar o quadro a cada vídeo deixava a importação lenta; o diálogo dá refresh no fim.
    console.log(`[drive-import] ok "${title}" em ${Date.now() - t0} ms`);
    return { success: true as const, lessonId: lesson.id };
  } catch (err) {
    const timeout = err instanceof Error && err.name === "TimeoutError";
    const msg = timeout ? "não respondeu a tempo" : err instanceof Error ? err.message : "falha desconhecida";
    console.error(`[drive-import] erro em ${step} após ${Date.now() - t0} ms: ${msg}`);
    return { success: false as const, error: `${step}: ${msg}` };
  }
}
