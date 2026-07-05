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

export function getBunnyThumbnailUrl(videoId: string): string {
  const { cdnHostname } = cfg();
  return `https://${cdnHostname}/${videoId}/thumbnail.jpg`;
}

// Consulta o status de processamento do vídeo (0-4 = enfileirado/processando, 4 = pronto).
export async function getBunnyVideoStatus(videoId: string): Promise<{ status: number; length: number }> {
  const { libraryId, apiKey } = cfg();
  const res = await fetch(`${API_BASE}/library/${libraryId}/videos/${videoId}`, {
    headers: { AccessKey: apiKey, accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Falha ao consultar vídeo no Bunny (${res.status}).`);
  const data = (await res.json()) as { status: number; length: number };
  return { status: data.status, length: data.length };
}
