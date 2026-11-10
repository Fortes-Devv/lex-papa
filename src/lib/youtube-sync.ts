import { db } from "@/lib/db";
import { recalcTotalsForModule } from "@/lib/course-totals";
import { listPlaylistVideos } from "@/lib/youtube-api";

// Sincronização da playlist acompanhada de um módulo: cada vídeo da playlist que ainda
// não está em nenhuma aula do módulo vira uma aula no fim, na ordem da playlist.
// Nunca apaga nem altera aulas: vídeo que sai da playlist não mexe na aula (o progresso
// dos alunos fica). Usada pelo botão "Sincronizar" e pela checagem diária (cron).
// Fora de "use server" de propósito: helper interno, não endpoint.

export type SyncResult = { created: number; titles: string[]; hiddenPositions: number[] };

export async function syncModulePlaylist(moduleId: string): Promise<SyncResult> {
  const mod = await db.module.findUnique({
    where: { id: moduleId },
    select: { youtubePlaylistId: true, youtubeAutoPublish: true, lessons: { select: { youtubeId: true, order: true } } },
  });
  if (!mod?.youtubePlaylistId) throw new Error("Este módulo não acompanha nenhuma playlist do YouTube.");

  const playlist = await listPlaylistVideos(mod.youtubePlaylistId);
  const known = new Set(mod.lessons.map((l) => l.youtubeId).filter(Boolean));
  // O mesmo vídeo repetido na playlist entra uma vez só.
  const fresh = playlist.videos.filter((v) => !known.has(v.id) && known.add(v.id));

  if (fresh.length > 0) {
    const start = Math.max(0, ...mod.lessons.map((l) => l.order)) + 1;
    await db.$transaction(fresh.map((v, i) => db.lesson.create({
      data: {
        moduleId,
        title: v.title.trim().slice(0, 200) || "Aula",
        type: "video",
        status: mod.youtubeAutoPublish ? "published" : "draft",
        order: start + i,
        videoProvider: "youtube",
        youtubeId: v.id,
        duration: v.duration,
      },
    })));
    await recalcTotalsForModule(moduleId);
  }
  await db.module.update({ where: { id: moduleId }, data: { youtubeSyncedAt: new Date() } });
  return { created: fresh.length, titles: fresh.map((v) => v.title), hiddenPositions: playlist.hiddenPositions };
}
