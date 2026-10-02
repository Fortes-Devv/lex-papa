/* eslint-disable @next/next/no-img-element -- otimização feita pelo próprio Cloudinary (f_auto,q_auto,w_), sem o Image Optimizer da Vercel */
import type { ImgHTMLAttributes } from "react";

// Pede ao Cloudinary a imagem já otimizada: formato automático (WebP/AVIF),
// qualidade automática e no máximo `width` px (2x para telas retina).
// URLs de outros lugares (ou que já têm transformação) ficam como estão.
// `aspect` (ex.: "16:10") recorta no Cloudinary com foco automático no assunto (g_auto).
export function cloudinaryUrl(url: string | null | undefined, width: number, aspect?: string): string {
  if (!url) return "";
  const marker = "/image/upload/";
  if (!url.includes("res.cloudinary.com") || !url.includes(marker)) return url;
  const [base, rest] = url.split(marker);
  // Já tem transformação (ex.: "c_fill,w_300/v123/...")? Não mexe.
  if (/^[a-z]_[^/]*\//.test(rest)) return url;
  const crop = aspect ? `c_fill,g_auto,ar_${aspect}` : "c_limit";
  return `${base}${marker}f_auto,q_auto,${crop},w_${Math.round(width * 2)}/${rest}`;
}

// <img> para imagens do Cloudinary (capas, avatares): otimizada e com carregamento sob demanda.
export function CdnImg({ src, width, aspect, alt, loading = "lazy", ...rest }: Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "width"> & { src: string | null | undefined; width: number; aspect?: string }) {
  return <img src={cloudinaryUrl(src, width, aspect)} alt={alt ?? ""} loading={loading} decoding="async" {...rest} />;
}
