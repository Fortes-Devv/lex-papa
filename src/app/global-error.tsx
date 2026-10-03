"use client";
import { useEffect } from "react";

// Último recurso: erro no layout raiz. Substitui o <html> inteiro, então não usa
// os componentes/estilos do app (podem ser justamente o que falhou).
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Erro com digest já foi registrado no servidor; os outros (só no navegador) são enviados aos Logs.
    if (!error.digest) fetch("/api/client-error", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: error.message, path: window.location.pathname }), keepalive: true }).catch(() => {});
  }, [error]);
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#FDFAF5", color: "#1d1a16" }}>
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 16, textAlign: "center" }}>
          <h1 style={{ fontSize: 20, margin: 0 }}>Algo deu errado</h1>
          <p style={{ fontSize: 14, color: "#6b6259", margin: 0 }}>Não foi possível carregar a LEX Concursos. Tente novamente em instantes.</p>
          {error.digest && <p style={{ fontSize: 12, color: "#6b6259", margin: 0 }}>Código do erro: {error.digest}</p>}
          <button onClick={reset} style={{ marginTop: 8, padding: "8px 16px", borderRadius: 8, border: "none", background: "#E8650A", color: "#fff", fontSize: 14, cursor: "pointer" }}>
            Tentar novamente
          </button>
        </div>
      </body>
    </html>
  );
}
