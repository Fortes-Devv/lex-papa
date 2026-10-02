import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl() ?? "https://lexcursos.site";
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Áreas logadas, APIs e pagamento não devem aparecer no Google.
      disallow: ["/admin", "/teacher", "/student", "/api", "/checkout", "/preview"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
