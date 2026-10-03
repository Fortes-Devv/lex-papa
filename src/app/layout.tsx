import type { Metadata, Viewport } from "next";
import { ToastProvider } from "@/components/ui/toast";
import { SessionProvider } from "@/components/providers/session-provider";
import "@fontsource-variable/manrope";
import "@fontsource-variable/archivo";
import "@fontsource-variable/source-serif-4";
import "@/styles/globals.css";
import { siteUrl } from "@/lib/site-url";
import { PwaRegister } from "@/components/pwa/pwa";

export const metadata: Metadata = {
  // Base das URLs absolutas (prévia de link, canonical).
  metadataBase: new URL(siteUrl() ?? "https://lexcursos.site"),
  title: { default: "LEX Concursos — Sua aprovação começa aqui", template: "%s | LEX Concursos" },
  description: "A plataforma de preparação para concursos públicos com cursos para GMF, PPCE, TJCE, GCM e muito mais.",
  keywords: ["concursos públicos", "preparatório", "GMF", "PPCE", "TJCE", "GCM", "direito", "segurança pública"],
  authors: [{ name: "LEX Concursos" }],
  robots: "index, follow",
  icons: { icon: [{ url: "/icons/favicon-48.png", sizes: "48x48", type: "image/png" }, { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }], apple: "/icons/apple-touch-icon.png" },
  // App instalado (PWA): no iPhone abre em tela cheia com este nome.
  appleWebApp: { capable: true, title: "LEX", statusBarStyle: "default" },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "LEX Concursos",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // app instalado usa a área toda (barras com safe-area)
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FDFAF5" },
    { media: "(prefers-color-scheme: dark)", color: "#0C0907" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <PwaRegister />
        <SessionProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
