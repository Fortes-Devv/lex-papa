import type { Metadata, Viewport } from "next";
import { ToastProvider } from "@/components/ui/toast";
import "@fontsource-variable/inter";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: { default: "LEX Concursos — Sua aprovação começa aqui", template: "%s | LEX Concursos" },
  description: "A plataforma de preparação para concursos públicos com cursos para GMF, PPCE, TJCE, GCM e muito mais.",
  keywords: ["concursos públicos", "preparatório", "GMF", "PPCE", "TJCE", "GCM", "direito", "segurança pública"],
  authors: [{ name: "LEX Concursos" }],
  robots: "index, follow",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "LEX Concursos",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FDFAF5" },
    { media: "(prefers-color-scheme: dark)", color: "#0C0907" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
