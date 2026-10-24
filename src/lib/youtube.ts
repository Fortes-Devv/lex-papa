// YouTube: funções puras (servem no navegador e no servidor).

const ID = /^[A-Za-z0-9_-]{11}$/;

// Aceita o link em qualquer formato comum (watch?v=, youtu.be/, embed/, shorts/, live/)
// ou o ID puro. Devolve o ID de 11 caracteres, ou null se não reconhecer.
export function parseYoutubeId(input: string): string | null {
  const text = input.trim();
  if (ID.test(text)) return text;
  let url: URL;
  try {
    url = new URL(text.startsWith("http") ? text : `https://${text}`);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www|m|music)\./, "");
  let id: string | null = null;
  if (host === "youtu.be") id = url.pathname.slice(1).split("/")[0];
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    id = url.searchParams.get("v");
    const m = url.pathname.match(/^\/(embed|shorts|live|v)\/([^/?#]+)/);
    if (!id && m) id = m[2];
  }
  return id && ID.test(id) ? id : null;
}

// ID de playlist (list=PL...) num link do YouTube, ou o ID puro.
export function parsePlaylistId(input: string): string | null {
  const text = input.trim();
  if (/^(PL|UU|LL|FL|OL)[A-Za-z0-9_-]{10,}$/.test(text)) return text;
  try {
    const list = new URL(text.startsWith("http") ? text : `https://${text}`).searchParams.get("list");
    return list && /^[A-Za-z0-9_-]{10,}$/.test(list) ? list : null;
  } catch {
    return null;
  }
}

// Duração ISO 8601 da API (PT1H2M3S) em segundos.
export function parseIsoDuration(iso: string): number | null {
  const m = iso.match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) return null;
  const [, d, h, min, s] = m.map((v) => Number(v ?? 0));
  return d * 86400 + h * 3600 + min * 60 + s;
}

// Fonte de vídeo do player para um vídeo do YouTube ("youtube:ID").
export const YOUTUBE_SRC_PREFIX = "youtube:";
export const youtubeSrc = (id: string) => `${YOUTUBE_SRC_PREFIX}${id}`;
export const youtubeIdFromSrc = (src: string) => (src.startsWith(YOUTUBE_SRC_PREFIX) ? src.slice(YOUTUBE_SRC_PREFIX.length) : null);
export const youtubeThumb = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

// Marcador do player do aluno: a aula toca do YouTube, e o ID é pedido ao servidor
// só quando a aula é aberta (a lista de aulas nunca leva os IDs).
export const YOUTUBE_PENDING = "youtube";
