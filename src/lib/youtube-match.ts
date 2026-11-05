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

// Número da aula no título ("Aula 07 - ..." → 7).
function lessonNumber(title: string): number | null {
  const m = normalizeTitle(title).match(/^aula (\d+)\b/);
  return m ? Number(m[1]) : null;
}

// Só serve de identificador se nenhum número se repete na lista (num curso em que cada
// módulo recomeça da "Aula 01", o número sozinho ligaria o vídeo à aula errada).
function numbersAreUnique(titles: string[]): boolean {
  const nums = titles.map(lessonNumber).filter((n) => n !== null);
  return new Set(nums).size === nums.length;
}

const MIN_CUT_TITLE = 30;

// Pelo título: o YouTube usa o nome do arquivo como título, e o import do Drive também
// criou as aulas com o nome do arquivo. Títulos repetidos são ligados na ordem.
// O que sobra ainda tem duas chances, porque o YouTube corta o título em 100 caracteres e
// o título pode ter sido ajustado à mão: título cortado e, por fim, número da aula.
export function matchByTitle(lessons: MatchLesson[], videos: MatchVideo[]): MatchResult {
  const byTitle = new Map<string, MatchVideo[]>();
  for (const v of videos) {
    const k = normalizeTitle(v.title);
    byTitle.set(k, [...(byTitle.get(k) ?? []), v]);
  }
  const used = new Set<string>();
  const found = new Map<string, MatchVideo>();
  for (const lesson of lessons) {
    const video = byTitle.get(normalizeTitle(lesson.title))?.shift();
    if (video) { found.set(lesson.id, video); used.add(video.id); }
  }

  // Liga aula e vídeo só quando o critério aponta um único vídeo livre e nenhuma outra aula o quer.
  const linkLeftovers = (fits: (lesson: MatchLesson, video: MatchVideo) => boolean) => {
    const freeLessons = lessons.filter((l) => !found.has(l.id));
    const freeVideos = videos.filter((v) => !used.has(v.id));
    for (const lesson of freeLessons) {
      const options = freeVideos.filter((v) => fits(lesson, v));
      if (options.length !== 1) continue;
      if (freeLessons.filter((l) => fits(l, options[0])).length !== 1) continue;
      found.set(lesson.id, options[0]);
      used.add(options[0].id);
    }
  };
  linkLeftovers((lesson, video) => {
    const cut = normalizeTitle(video.title);
    return cut.length >= MIN_CUT_TITLE && normalizeTitle(lesson.title).startsWith(cut);
  });
  if (numbersAreUnique(lessons.map((l) => l.title)) && numbersAreUnique(videos.map((v) => v.title))) {
    linkLeftovers((lesson, video) => {
      const n = lessonNumber(lesson.title);
      return n !== null && n === lessonNumber(video.title);
    });
  }

  const pairs: MatchPair[] = [];
  const lessonsWithout: MatchLesson[] = [];
  for (const lesson of lessons) {
    const video = found.get(lesson.id);
    if (video) pairs.push({ lesson, video });
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
