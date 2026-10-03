/** @type {import('next').NextConfig} */
const nextConfig = {
  // Service worker do PWA: sempre a versão mais nova (sem cache do navegador).
  async headers() {
    return [{ source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }, { key: "Content-Type", value: "application/javascript; charset=utf-8" }] }];
  },
  images: {
    // Só o Cloudinary (capas, avatares e materiais). Hosts de demonstração removidos.
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
  },
};
export default nextConfig;
