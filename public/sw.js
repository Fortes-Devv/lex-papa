// Service worker da LEX (PWA). Simples de propósito:
// - arquivos estáticos do Next (/_next/static), ícones e fontes: cache (mudam de nome a cada deploy);
// - páginas: sempre da rede; sem internet, mostra /offline. Páginas com dados do aluno NÃO são guardadas;
// - API, vídeos, PDFs e outros domínios (Bunny, Cloudinary, Mercado Pago): nunca passam pelo cache.
const VERSION = "lex-v1";
const STATIC_CACHE = `${VERSION}-static`;
const PRECACHE = ["/offline", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Navegação: rede; sem internet, a página "sem conexão".
  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match("/offline")));
    return;
  }

  // Estáticos com nome versionado: cache primeiro.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || /\.(woff2?|ttf)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(STATIC_CACHE).then((c) => c.put(req, copy)); }
        return res;
      })),
    );
  }
  // Todo o resto (API, PDFs, imagens de páginas, RSC): direto da rede, sem cache.
});
