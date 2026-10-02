// URL pública do site, de configuração — NUNCA do header Host da requisição
// (host header poisoning). Usada em links de e-mail, metadados, sitemap e robots.
export function siteUrl(): string | null {
  const fromEnv = process.env.APP_URL?.trim().replace(/\/+$/, "");
  if (fromEnv) return fromEnv;
  // Fallback: domínio de produção definido pela própria Vercel.
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.NODE_ENV !== "production") return "http://localhost:3000";
  return null;
}
