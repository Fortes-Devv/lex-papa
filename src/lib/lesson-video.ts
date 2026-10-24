import { resolveLessonThumbUrl, resolveLessonVideoUrl } from "@/lib/bunny";
import { YOUTUBE_PENDING, youtubeSrc, youtubeThumb } from "@/lib/youtube";

// Vídeo da aula: Bunny ou YouTube, escolhido por `videoProvider`.
// O vídeo da Bunny (videoPublicId) continua guardado quando a aula passa a tocar do
// YouTube: é a reserva para voltar na hora ("Voltar para a Bunny").

export type LessonVideoFields = {
  videoUrl: string | null;
  videoProvider: string | null;
  videoPublicId: string | null;
  youtubeId: string | null;
};

export const playsFromYoutube = (l: Pick<LessonVideoFields, "videoProvider" | "youtubeId">) =>
  l.videoProvider === "youtube" && !!l.youtubeId;

// A aula tem algum vídeo (de qualquer provedor)?
export const lessonHasVideo = (l: LessonVideoFields) => Boolean(l.videoUrl || l.videoPublicId || l.youtubeId);

// ID do vídeo na Bunny (inclusive a reserva de uma aula que toca do YouTube).
export const bunnyVideoIdOf = (l: Pick<LessonVideoFields, "videoProvider" | "videoPublicId">) =>
  l.videoProvider === "bunny" || l.videoProvider === "youtube" ? l.videoPublicId : null;

// Fonte para o player. Só para a EQUIPE (editor, "Assistir como aluno"): no YouTube o ID
// vai junto. Para o aluno, o player pede o ID da aula aberta (getLessonYoutubeId), para
// a lista de aulas nunca levar os IDs do curso inteiro.
export function staffVideoSrc(l: LessonVideoFields): string | null {
  if (playsFromYoutube(l)) return youtubeSrc(l.youtubeId!);
  return resolveLessonVideoUrl(l);
}

export function studentVideoSrc(l: LessonVideoFields): string | null {
  if (playsFromYoutube(l)) return YOUTUBE_PENDING;
  return resolveLessonVideoUrl(l);
}

export function lessonThumbUrl(l: LessonVideoFields): string | null {
  if (playsFromYoutube(l)) return youtubeThumb(l.youtubeId!);
  return resolveLessonThumbUrl(l);
}
