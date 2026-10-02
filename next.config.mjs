/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Só o Cloudinary (capas, avatares e materiais). Hosts de demonstração removidos.
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
  },
};
export default nextConfig;
