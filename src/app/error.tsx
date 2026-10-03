"use client";
import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

// Erro inesperado numa página: mensagem amigável + tentar de novo (os detalhes ficam no log).
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
    // Erro com digest já foi registrado no servidor; os outros (só no navegador) são enviados aos Logs.
    if (!error.digest) fetch("/api/client-error", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: error.message, path: window.location.pathname }), keepalive: true }).catch(() => {});
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-7 w-7 text-destructive" />
      </div>
      <h1 className="text-xl font-semibold text-foreground">Algo deu errado</h1>
      <p className="max-w-sm text-sm text-foreground-muted">
        Não foi possível carregar esta página. Tente novamente em instantes.
        {error.digest && <span className="mt-2 block text-xs">Código do erro: {error.digest}</span>}
      </p>
      <div className="flex gap-2">
        <Button onClick={reset}>Tentar novamente</Button>
        <Link href="/"><Button variant="outline">Ir para o início</Button></Link>
      </div>
    </div>
  );
}
