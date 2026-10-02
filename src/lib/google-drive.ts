// Leitura de links públicos do Google Drive ("qualquer pessoa com o link"), sem API key.
// Usado na importação de aulas: o Bunny baixa o vídeo direto do Drive.

export type DriveLink = { kind: "file" | "folder"; id: string };
export interface DriveVideo { id: string; name: string }

const VIDEO_EXT = /\.(mp4|mov|m4v|mkv|webm|avi|wmv|mpe?g)$/i;

// Aceita /file/d/ID, /drive/folders/ID, open?id=ID, uc?id=ID e o ID puro.
export function parseDriveLink(input: string): DriveLink | null {
  const s = input.trim();
  const folder = s.match(/\/folders\/([\w-]{10,})/);
  if (folder) return { kind: "folder", id: folder[1] };
  const file = s.match(/\/file\/d\/([\w-]{10,})/) ?? s.match(/[?&]id=([\w-]{10,})/);
  if (file) return { kind: "file", id: file[1] };
  if (/^[\w-]{20,}$/.test(s)) return { kind: "file", id: s };
  return null;
}

// Link de download direto; confirm=t pula o aviso de "não foi possível verificar vírus" dos arquivos grandes.
export const driveDownloadUrl = (id: string) => `https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=t`;

const decodeEntities = (s: string) =>
  s.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

// Nome do arquivo sem extensão, para virar título da aula.
export const titleFromFileName = (name: string) => name.replace(/(\.[a-z0-9]{2,4})+$/i, "").replace(/\s+/g, " ").trim() || "Aula";

// Lista os vídeos de uma pasta pública (só o primeiro nível), ordenados pelo nome (01, 02, 10...).
export async function listDriveFolderVideos(folderId: string): Promise<DriveVideo[]> {
  const res = await fetch(`https://drive.google.com/embeddedfolderview?id=${folderId}`, { cache: "no-store", signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error("Pasta não encontrada. Confira se ela está compartilhada como \"Qualquer pessoa com o link\".");
  const html = await res.text();
  const videos: DriveVideo[] = [];
  // Cada item: <a href="https://drive.google.com/file/d/ID/view..."> ... <div class="flip-entry-title">NOME</div>
  const re = /href="https:\/\/drive\.google\.com\/file\/d\/([\w-]+)\/[^"]*"[\s\S]*?flip-entry-title">([^<]*)</g;
  for (let m = re.exec(html); m; m = re.exec(html)) {
    const name = decodeEntities(m[2]).trim();
    if (VIDEO_EXT.test(name)) videos.push({ id: m[1], name });
  }
  return videos.sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { numeric: true, sensitivity: "base" }));
}

// Confere se o arquivo está público e é um vídeo (baixa só 1 byte). Devolve nome e tamanho.
export async function checkDriveVideo(fileId: string): Promise<{ name: string | null; size: number | null }> {
  const res = await fetch(driveDownloadUrl(fileId), { headers: { Range: "bytes=0-0" }, cache: "no-store", signal: AbortSignal.timeout(10_000) });
  const type = res.headers.get("content-type") ?? "";
  await res.body?.cancel().catch(() => {});
  if (res.status === 404) throw new Error("Arquivo não encontrado no Drive.");
  if (!res.ok || type.startsWith("text/html")) {
    throw new Error("O Drive não liberou o arquivo. Compartilhe como \"Qualquer pessoa com o link\".");
  }
  if (!type.startsWith("video/") && type !== "application/octet-stream") throw new Error("Esse arquivo não é um vídeo.");
  const disposition = res.headers.get("content-disposition") ?? "";
  const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  let name = disposition.match(/filename="([^"]+)"/i)?.[1] ?? null;
  if (encoded) try { name = decodeURIComponent(encoded); } catch { /* fica o nome simples */ }
  const size = Number(res.headers.get("content-range")?.split("/")[1]) || null;
  return { name, size };
}
