import crypto from "crypto";

const API_BASE = "https://video.bunnycdn.com";

export function isBunnyConfigured() {
  return Boolean(process.env.BUNNY_STREAM_LIBRARY_ID && process.env.BUNNY_STREAM_API_KEY && process.env.BUNNY_STREAM_CDN_HOSTNAME);
}

function cfg() {
  const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID;
  const apiKey = process.env.BUNNY_STREAM_API_KEY;
  const cdnHostname = process.env.BUNNY_STREAM_CDN_HOSTNAME;
  if (!libraryId || !apiKey || !cdnHostname) throw new Error("Bunny Stream não configurado no .env.");
  return { libraryId, apiKey, cdnHostname };
}

// Cria o objeto de vídeo no Bunny (ainda sem o arquivo) e retorna o GUID.
export async function createBunnyVideo(title: string): Promise<{ videoId: string }> {
  const { libraryId, apiKey } = cfg();
  const res = await fetch(`${API_BASE}/library/${libraryId}/videos`, {
    method: "POST",
    headers: { AccessKey: apiKey, "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error(`Falha ao criar vídeo no Bunny (${res.status}).`);
  const data = (await res.json()) as { guid: string };
  return { videoId: data.guid };
}

// Gera a assinatura para upload direto do navegador via TUS.
// signature = sha256(libraryId + apiKey + expireTime + videoId)
export function buildUploadCredentials(videoId: string) {
  const { libraryId, apiKey, cdnHostname } = cfg();
  const expireTime = Math.floor(Date.now() / 1000) + 60 * 60; // válido por 1h
  const signature = crypto.createHash("sha256").update(libraryId + apiKey + expireTime + videoId).digest("hex");
  return { libraryId, videoId, expireTime, signature, endpoint: `${API_BASE}/tusupload`, cdnHostname };
}

export async function deleteBunnyVideo(videoId: string): Promise<void> {
  const { libraryId, apiKey } = cfg();
  await fetch(`${API_BASE}/library/${libraryId}/videos/${videoId}`, {
    method: "DELETE",
    headers: { AccessKey: apiKey, accept: "application/json" },
  }).catch(() => {});
}

export function getBunnyPlaybackUrl(videoId: string): string {
  const { cdnHostname } = cfg();
  return `https://${cdnHostname}/${videoId}/playlist.m3u8`;
}

const PLAYBACK_TOKEN_TTL = 4 * 60 * 60; // 4h: cobre aulas longas com pausas

// URL de reprodução assinada (Token Authentication da Pull Zone do Bunny).
// Usa o formato por diretório (/bcdn_token=...&token_path=/{videoId}/) para que
// os segmentos HLS (caminhos relativos ao playlist) herdem o token.
// token = base64url(sha256(securityKey + token_path + expires + "token_path=" + token_path))
// Só chame no servidor, depois de checar o acesso do usuário.
// Sem BUNNY_STREAM_TOKEN_KEY, devolve a URL pública (antes de ativar o token no painel).
export function signBunnyPlaybackUrl(videoId: string): string {
  return signBunnyFileUrl(videoId, "playlist.m3u8");
}

// Assina qualquer arquivo do vídeo (playlist, thumbnail.jpg...) com o token do diretório /{videoId}/.
function signBunnyFileUrl(videoId: string, file: string): string {
  const { cdnHostname } = cfg();
  const key = process.env.BUNNY_STREAM_TOKEN_KEY;
  const path = `/${videoId}/${file}`;
  if (!key) return `https://${cdnHostname}${path}`;

  const tokenPath = `/${videoId}/`;
  const expires = Math.floor(Date.now() / 1000) + PLAYBACK_TOKEN_TTL;
  const token = crypto
    .createHash("sha256")
    .update(key + tokenPath + expires + `token_path=${tokenPath}`)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
  return `https://${cdnHostname}/bcdn_token=${token}&token_path=${encodeURIComponent(tokenPath)}&expires=${expires}${path}`;
}

// Resolve a URL que o player deve tocar: vídeos do Bunny saem assinados; os demais, como estão.
export function resolveLessonVideoUrl(lesson: { videoUrl: string | null; videoProvider: string | null; videoPublicId: string | null }): string | null {
  if (lesson.videoProvider === "bunny" && lesson.videoPublicId && isBunnyConfigured()) {
    return signBunnyPlaybackUrl(lesson.videoPublicId);
  }
  return lesson.videoUrl;
}

export function getBunnyThumbnailUrl(videoId: string): string {
  const { cdnHostname } = cfg();
  return `https://${cdnHostname}/${videoId}/thumbnail.jpg`;
}

// Consulta o status de processamento do vídeo (0-4 = enfileirado/processando, 4 = pronto).
export async function getBunnyVideoStatus(videoId: string): Promise<{ status: number; length: number }> {
  const { libraryId, apiKey } = cfg();
  const res = await fetch(`${API_BASE}/library/${libraryId}/videos/${videoId}`, {
    headers: { AccessKey: apiKey, accept: "application/json" },
    signal: AbortSignal.timeout(4_000),
  });
  if (!res.ok) throw new Error(`Falha ao consultar vídeo no Bunny (${res.status}).`);
  const data = (await res.json()) as { status: number; length: number };
  return { status: data.status, length: data.length };
}

// Miniatura do vídeo (gerada pelo Bunny), assinada como o vídeo. null se não for do Bunny.
export function resolveLessonThumbUrl(lesson: { videoProvider: string | null; videoPublicId: string | null }): string | null {
  if (lesson.videoProvider === "bunny" && lesson.videoPublicId && isBunnyConfigured()) {
    return signBunnyFileUrl(lesson.videoPublicId, "thumbnail.jpg");
  }
  return null;
}

// Armazenamento usado pela biblioteca de vídeos (bytes). null se indisponível.
export async function getBunnyStorageBytes(): Promise<number | null> {
  if (!isBunnyConfigured()) return null;
  try {
    const { libraryId, apiKey } = cfg();
    const res = await fetch(`${API_BASE}/library/${libraryId}`, { headers: { AccessKey: apiKey, accept: "application/json" }, next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const data = (await res.json()) as { StorageUsage?: number };
    return typeof data.StorageUsage === "number" ? data.StorageUsage : null;
  } catch {
    return null;
  }
}

// O Bunny baixa o vídeo de uma URL (ex.: Google Drive) e processa sozinho.
// A resposta costuma trazer o id; se não trouxer (ou demorar), achamos o vídeo
// pelo marcador único no título. Depois o título vira o nome real.
export async function fetchBunnyVideoFromUrl(url: string, title: string): Promise<{ videoId: string }> {
  const { libraryId, apiKey } = cfg();
  const headers = { AccessKey: apiKey, "Content-Type": "application/json", accept: "application/json" };
  const tag = `lex-${crypto.randomBytes(6).toString("hex")}`;
  let id: string | undefined;
  try {
    const res = await fetch(`${API_BASE}/library/${libraryId}/videos/fetch`, {
      method: "POST",
      headers,
      body: JSON.stringify({ url, title: tag }),
      signal: AbortSignal.timeout(12_000),
    });
    const body = (await res.json().catch(() => ({}))) as { id?: string; success?: boolean; message?: string };
    if (res.status === 429) throw new Error("O Bunny está com a fila de importações cheia. Tente de novo em alguns minutos.");
    if (!res.ok || body.success === false) throw new Error(`O Bunny não aceitou o link${body.message ? `: ${body.message}` : ` (${res.status})`}.`);
    id = body.id;
  } catch (err) {
    // Timeout: o Bunny pode já ter criado o vídeo; segue para a busca pelo marcador.
    if (!(err instanceof Error && err.name === "TimeoutError")) throw err;
  }
  if (id) {
    await fetch(`${API_BASE}/library/${libraryId}/videos/${id}`, { method: "POST", headers, body: JSON.stringify({ title }), signal: AbortSignal.timeout(5_000) }).catch(() => {});
    return { videoId: id };
  }

  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt) await new Promise((r) => setTimeout(r, 1000));
    const list = await fetch(`${API_BASE}/library/${libraryId}/videos?page=1&itemsPerPage=5&search=${tag}`, { headers, cache: "no-store", signal: AbortSignal.timeout(5_000) }).catch(() => null);
    if (!list) continue;
    const data = (await list.json().catch(() => ({}))) as { items?: { guid: string; title: string }[] };
    const video = data.items?.find((v) => v.title === tag);
    if (video) {
      await fetch(`${API_BASE}/library/${libraryId}/videos/${video.guid}`, { method: "POST", headers, body: JSON.stringify({ title }), signal: AbortSignal.timeout(5_000) }).catch(() => {});
      return { videoId: video.guid };
    }
  }
  throw new Error("O Bunny recebeu o link, mas o vídeo não apareceu na biblioteca. Tente de novo em instantes.");
}
