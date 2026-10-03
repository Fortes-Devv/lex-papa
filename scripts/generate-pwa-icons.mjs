// Gera os ícones do PWA a partir de public/logo.png: node scripts/generate-pwa-icons.mjs
// Fundo branco (o logo é escuro + laranja); a borda transparente do logo é recortada. "maskable" tem margem de segurança
// (o Android recorta em círculo/gota); "any" ocupa mais da área.
import sharp from "sharp";

const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };
const logo = "public/logo.png";

async function icon(size, scale, out) {
  const inner = Math.round(size * scale);
  const img = await sharp(await sharp(logo).trim().toBuffer()).resize(inner, inner, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } }).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: WHITE } })
    .composite([{ input: img, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toFile(out);
  console.log(out);
}

await icon(192, 0.86, "public/icons/icon-192.png");
await icon(512, 0.86, "public/icons/icon-512.png");
await icon(512, 0.7, "public/icons/icon-maskable-512.png");
await icon(180, 0.84, "public/icons/apple-touch-icon.png");
await icon(48, 0.94, "public/icons/favicon-48.png");
