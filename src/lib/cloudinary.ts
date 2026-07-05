import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export { cloudinary };

// Extrai o public_id de uma URL do Cloudinary.
// Ex: https://res.cloudinary.com/xx/image/upload/v123/lms/thumbnails/abc.png → lms/thumbnails/abc
export function publicIdFromUrl(url: string): string | null {
  const m = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z0-9]+$/);
  return m ? m[1] : null;
}

// Deleta uma imagem do Cloudinary a partir da URL (best-effort, nunca lança).
export async function deleteCloudinaryImageByUrl(url?: string | null): Promise<void> {
  if (!url || !url.includes("res.cloudinary.com")) return;
  const publicId = publicIdFromUrl(url);
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch {
    // silencioso
  }
}
