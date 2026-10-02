import Link from "next/link";
import Image from "next/image";
import { AlertTriangle } from "lucide-react";

// Página legal simples (termos, privacidade). O conteúdo vive no código porque
// o CMS foi removido; trechos entre [COLCHETES] precisam ser preenchidos pelo dono.
export function LegalPage({ title, updatedAt, children }: { title: string; updatedAt: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/login" className="mb-8 inline-flex items-center gap-2">
        <Image src="/logo.png" alt="LEX Concursos" width={38} height={32} className="object-contain" />
      </Link>
      <h1 className="text-2xl font-bold text-foreground">{title}</h1>
      <p className="mt-1 text-sm text-foreground-muted">Última atualização: {updatedAt}</p>

      <div className="mt-6 flex items-start gap-3 rounded-md border border-warning/40 bg-warning-muted/30 p-4 text-sm">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        <p className="text-foreground-muted">
          Rascunho: este texto é um modelo e deve ser revisado por um advogado antes de valer. Os trechos entre colchetes
          ainda precisam ser preenchidos.
        </p>
      </div>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-foreground [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1">
        {children}
      </div>

      <p className="mt-12 border-t border-border pt-6 text-xs text-foreground-muted">
        <Link href="/termos" className="hover:underline">Termos de Uso</Link>
        {" · "}
        <Link href="/privacidade" className="hover:underline">Política de Privacidade</Link>
      </p>
    </div>
  );
}
