"use server";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth-guards";
import { db } from "@/lib/db";
import { canEditCourse, canEditModule, NOT_ALLOWED } from "@/lib/course-permissions";
import { recalcTotalsForModule } from "@/lib/course-totals";
import { deleteBunnyVideo } from "@/lib/bunny";
import { logAudit } from "@/lib/audit";
import { listPlaylistVideos } from "@/lib/youtube-api";
import { parsePlaylistId, parseYoutubeId } from "@/lib/youtube";
import type { MatchLesson, MatchVideo } from "@/lib/youtube-match";

// Vídeos do YouTube nas aulas: ler playlist, ligar às aulas existentes, criar aulas,
// trocar o módulo entre YouTube e Bunny e, no fim, apagar as cópias da Bunny.

export type YoutubeScope = { kind: "module"; moduleId: string } | { kind: "course"; courseId: string };

async function allowed(scope: YoutubeScope) {
  const session = await requireStaff();
  const ok = scope.kind === "module" ? await canEditModule(session.user, scope.moduleId) : await canEditCourse(session.user, scope.courseId);
  return ok ? session : null;
}

// Passo 1: lê a playlist e as aulas do módulo (ou do curso inteiro, para ligar pelo título).
export async function previewYoutubePlaylist(scope: YoutubeScope, link: string) {
  if (!(await allowed(scope))) return NOT_ALLOWED;
  const playlistId = parsePlaylistId(link);
  if (!playlistId) return { success: false as const, error: "Cole o link de uma playlist do YouTube (tem \"list=\" no endereço)." };
  try {
    const videos: MatchVideo[] = (await listPlaylistVideos(playlistId)).map((v) => ({ id: v.id, title: v.title, duration: v.duration }));
    if (videos.length === 0) return { success: false as const, error: "A playlist não tem vídeos públicos ou não listados." };
    const lessons: MatchLesson[] = scope.kind === "module"
      ? (await db.lesson.findMany({ where: { moduleId: scope.moduleId }, orderBy: { order: "asc" }, select: { id: true, title: true } }))
      : (await db.courseModule.findMany({
          where: { courseId: scope.courseId },
          orderBy: [{ section: "asc" }, { order: "asc" }],
          select: { module: { select: { title: true, lessons: { orderBy: { order: "asc" }, select: { id: true, title: true } } } } },
        })).flatMap((cm) => cm.module.lessons.map((l) => ({ ...l, moduleTitle: cm.module.title })));
    return { success: true as const, videos, lessons };
  } catch (err) {
    return { success: false as const, error: err instanceof Error ? err.message : "Não foi possível ler a playlist." };
  }
}

// Passo 2a: liga cada vídeo à sua aula. O vídeo da Bunny continua guardado como reserva.
// playNow = a aula já passa a tocar do YouTube.
export async function linkYoutubeVideos(scope: YoutubeScope, pairs: { lessonId: string; youtubeId: string; duration: number | null }[], playNow: boolean) {
  const session = await allowed(scope);
  if (!session) return NOT_ALLOWED;
  const valid = pairs.filter((p) => parseYoutubeId(p.youtubeId) === p.youtubeId).slice(0, 500);
  // Só aulas do próprio módulo/curso (o cliente não escolhe aula de fora).
  const inScope = await db.lesson.findMany({
    where: {
      id: { in: valid.map((p) => p.lessonId) },
      ...(scope.kind === "module" ? { moduleId: scope.moduleId } : { module: { courses: { some: { courseId: scope.courseId } } } }),
    },
    select: { id: true, moduleId: true, duration: true },
  });
  const byId = new Map(inScope.map((l) => [l.id, l]));
  const updates = valid.filter((p) => byId.has(p.lessonId)).map((p) => db.lesson.update({
    where: { id: p.lessonId },
    data: {
      youtubeId: p.youtubeId,
      ...(playNow ? { videoProvider: "youtube" as const } : {}),
      // Duração: mantém a que já existe (vinda da Bunny); preenche se faltar.
      ...(byId.get(p.lessonId)!.duration == null && p.duration ? { duration: p.duration } : {}),
    },
  }));
  await db.$transaction(updates);
  for (const moduleId of new Set(inScope.map((l) => l.moduleId))) await recalcTotalsForModule(moduleId);
  await logAudit({ actorId: session.user.id, action: "lesson.youtube_linked", resourceType: scope.kind, resourceId: scope.kind === "module" ? scope.moduleId : scope.courseId, metadata: { count: updates.length, playNow } });
  revalidatePath("/admin/courses");
  return { success: true as const, count: updates.length };
}

// Passo 2b: cria aulas novas no fim do módulo, uma por vídeo (como no import do Drive).
export async function createLessonsFromYoutube(moduleId: string, items: { youtubeId: string; title: string; duration: number | null }[], publish: boolean) {
  const session = await allowed({ kind: "module", moduleId });
  if (!session) return NOT_ALLOWED;
  const valid = items.filter((i) => parseYoutubeId(i.youtubeId) === i.youtubeId).slice(0, 200);
  const last = await db.lesson.findFirst({ where: { moduleId }, orderBy: { order: "desc" }, select: { order: true } });
  const start = (last?.order ?? 0) + 1;
  await db.$transaction(valid.map((it, i) => db.lesson.create({
    data: {
      moduleId,
      title: it.title.trim().slice(0, 200) || "Aula",
      type: "video",
      status: publish ? "published" : "draft",
      order: start + i,
      videoProvider: "youtube",
      youtubeId: it.youtubeId,
      duration: it.duration,
    },
  })));
  await recalcTotalsForModule(moduleId);
  await logAudit({ actorId: session.user.id, action: "lesson.imported_youtube", resourceType: "module", resourceId: moduleId, metadata: { count: valid.length } });
  revalidatePath("/admin/courses");
  return { success: true as const, count: valid.length };
}

// Troca de onde o módulo toca. Para o YouTube só vão as aulas que têm vídeo lá; para a
// Bunny só as que ainda têm a cópia guardada.
export async function setModuleVideoSource(moduleId: string, source: "youtube" | "bunny") {
  const session = await allowed({ kind: "module", moduleId });
  if (!session) return NOT_ALLOWED;
  const { count } = await db.lesson.updateMany({
    where: source === "youtube"
      ? { moduleId, youtubeId: { not: null } }
      : { moduleId, videoPublicId: { not: null }, videoProvider: "youtube" },
    data: { videoProvider: source },
  });
  await logAudit({ actorId: session.user.id, action: "module.video_source", resourceType: "module", resourceId: moduleId, metadata: { source, count } });
  revalidatePath("/admin/courses");
  return { success: true as const, count };
}

// Apaga da Bunny os vídeos das aulas que já tocam do YouTube (é o que reduz o custo de
// armazenamento). Depois disso, voltar para a Bunny só reimportando do Drive.
export async function deleteBunnyBackups(moduleId: string) {
  const session = await allowed({ kind: "module", moduleId });
  if (!session) return NOT_ALLOWED;
  const lessons = await db.lesson.findMany({
    where: { moduleId, videoProvider: "youtube", youtubeId: { not: null }, videoPublicId: { not: null } },
    select: { id: true, videoPublicId: true },
  });
  let deleted = 0;
  for (const l of lessons) {
    try {
      await deleteBunnyVideo(l.videoPublicId!);
      await db.lesson.update({ where: { id: l.id }, data: { videoPublicId: null, videoUrl: null } });
      deleted++;
    } catch (err) {
      console.error("[youtube] não foi possível apagar a cópia da Bunny:", l.id, err);
    }
  }
  await logAudit({ actorId: session.user.id, action: "module.bunny_backups_deleted", resourceType: "module", resourceId: moduleId, metadata: { deleted, total: lessons.length } });
  revalidatePath("/admin/courses");
  return deleted === lessons.length
    ? { success: true as const, count: deleted }
    : { success: false as const, error: `Apagadas ${deleted} de ${lessons.length}. Tente de novo para as que faltaram.` };
}
