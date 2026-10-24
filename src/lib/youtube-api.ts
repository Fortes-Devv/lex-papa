import { parseIsoDuration } from "@/lib/youtube";

// Leitura de playlists pela YouTube Data API v3 (só leitura, com a chave
// YOUTUBE_API_KEY do servidor). A plataforma não envia vídeos ao YouTube: vídeo enviado
// pela API por projeto não auditado fica privado. Vocês sobem pelo YouTube Studio e
// a plataforma lê a playlist.
// Fora de "use server" de propósito: helper interno, não endpoint.

const API = "https://www.googleapis.com/youtube/v3";
const MAX_VIDEOS = 500;

export interface PlaylistVideo { id: string; title: string; position: number; duration: number | null }

export const isYoutubeApiConfigured = () => Boolean(process.env.YOUTUBE_API_KEY);

async function call<T>(path: string, params: Record<string, string>): Promise<T> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error("Falta configurar a chave da API do YouTube (YOUTUBE_API_KEY) na Vercel.");
  const qs = new URLSearchParams({ ...params, key });
  const res = await fetch(`${API}/${path}?${qs}`, { cache: "no-store", signal: AbortSignal.timeout(15_000) });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string; errors?: { reason?: string }[] } } | null;
    const reason = body?.error?.errors?.[0]?.reason;
    if (res.status === 404 || reason === "playlistNotFound") throw new Error("Playlist não encontrada. Confira o link e se ela está como pública ou não listada (privada não funciona).");
    if (reason === "quotaExceeded") throw new Error("A cota diária da API do YouTube acabou. Tente de novo amanhã.");
    if (res.status === 400 || res.status === 403) throw new Error("A chave da API do YouTube foi recusada. Confira YOUTUBE_API_KEY e se a YouTube Data API v3 está ativada no Google Cloud.");
    throw new Error(`O YouTube respondeu com erro ${res.status}.`);
  }
  return (await res.json()) as T;
}

// Vídeos da playlist, na ordem dela, com título e duração. Vídeos privados ou
// apagados ficam de fora (não tocam para o aluno).
export async function listPlaylistVideos(playlistId: string): Promise<PlaylistVideo[]> {
  type ItemsPage = {
    nextPageToken?: string;
    items: { snippet: { title: string; position: number; resourceId: { videoId: string } }; status?: { privacyStatus?: string } }[];
  };
  const items: { id: string; title: string; position: number }[] = [];
  let pageToken = "";
  do {
    const page = await call<ItemsPage>("playlistItems", { part: "snippet,status", playlistId, maxResults: "50", ...(pageToken ? { pageToken } : {}) });
    for (const it of page.items) {
      const privacy = it.status?.privacyStatus;
      if (privacy === "private" || privacy === "privacyStatusUnspecified") continue;
      if (it.snippet.title === "Deleted video" || it.snippet.title === "Private video") continue;
      items.push({ id: it.snippet.resourceId.videoId, title: it.snippet.title, position: it.snippet.position });
    }
    pageToken = page.nextPageToken ?? "";
  } while (pageToken && items.length < MAX_VIDEOS);

  // Durações em lotes de 50.
  const durations = new Map<string, number | null>();
  for (let i = 0; i < items.length; i += 50) {
    const ids = items.slice(i, i + 50).map((v) => v.id).join(",");
    const res = await call<{ items: { id: string; contentDetails: { duration: string } }[] }>("videos", { part: "contentDetails", id: ids, maxResults: "50" });
    for (const v of res.items) durations.set(v.id, parseIsoDuration(v.contentDetails.duration));
  }
  return items.slice(0, MAX_VIDEOS).map((v) => ({ ...v, duration: durations.get(v.id) ?? null }));
}
