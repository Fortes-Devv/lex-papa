import type { Metadata } from "next";
import { RetryButton } from "./retry-button";

export const metadata: Metadata = { title: "Sem conexão" };

// Mostrada pelo app instalado (service worker) quando não há internet.
export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element -- precisa abrir sem internet (arquivo em cache) */}
      <img src="/icons/icon-192.png" alt="LEX Concursos" width={72} height={72} className="rounded-2xl" />
      <h1 className="text-[22px] font-extrabold text-foreground">Você está sem internet</h1>
      <p className="max-w-xs text-sm text-foreground-muted">As aulas e os PDFs precisam de conexão. Assim que a internet voltar, é só tentar de novo.</p>
      <RetryButton />
    </div>
  );
}
