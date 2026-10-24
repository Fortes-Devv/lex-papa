// Liga vídeos de uma playlist do YouTube às aulas que já existem (funções puras: rodam
// no navegador para a tela de conferência e nos testes).

export interface MatchLesson { id: string; title: string; moduleTitle?: string }
export interface MatchVideo { id: string; title: string; duration: number | null }
export interface MatchPair { lesson: MatchLesson; video: MatchVideo }
export interface MatchResult { pairs: MatchPair[]; lessonsWithout: MatchLesson[]; videosUnused: MatchVideo[] }

// Título comparável: sem acento, minúsculo, sem extensão de arquivo e sem pontuação.
export function normalizeTitle(title: string): string {
  return title
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\.(mp4|mov|m4v|mkv|webm|avi)$/i, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Pelo título: o YouTube usa o nome do arquivo como título, e o import do Drive também
// criou as aulas com o nome do arquivo. Títulos repetidos são ligados na ordem.
export function matchByTitle(lessons: MatchLesson[], videos: MatchVideo[]): MatchResult {
  const byTitle = new Map<string, MatchVideo[]>();
  for (const v of videos) {
    const k = normalizeTitle(v.title);
    byTitle.set(k, [...(byTitle.get(k) ?? []), v]);
  }
  const used = new Set<string>();
  const pairs: MatchPair[] = [];
  const lessonsWithout: MatchLesson[] = [];
  for (const lesson of lessons) {
    const queue = byTitle.get(normalizeTitle(lesson.title));
    const video = queue?.shift();
    if (video) { pairs.push({ lesson, video }); used.add(video.id); }
    else lessonsWithout.push(lesson);
  }
  return { pairs, lessonsWithout, videosUnused: videos.filter((v) => !used.has(v.id)) };
}

// Pela ordem: aula 1 com o vídeo 1, aula 2 com o vídeo 2...
export function matchByOrder(lessons: MatchLesson[], videos: MatchVideo[]): MatchResult {
  const n = Math.min(lessons.length, videos.length);
  return {
    pairs: lessons.slice(0, n).map((lesson, i) => ({ lesson, video: videos[i] })),
    lessonsWithout: lessons.slice(n),
    videosUnused: videos.slice(n),
  };
}
