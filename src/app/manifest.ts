import type { MetadataRoute } from "next";

// PWA: deixa a LEX instalável (ícone na tela inicial, abre em tela cheia como app).
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "LEX Concursos",
    short_name: "LEX",
    description: "Aulas em vídeo e PDFs para concursos. Continue de onde parou.",
    lang: "pt-BR",
    start_url: "/?origem=app",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#f7f5f2",
    theme_color: "#1f2b3a",
    categories: ["education"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Continuar estudando", url: "/student/dashboard", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Meu curso", url: "/student/course", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
