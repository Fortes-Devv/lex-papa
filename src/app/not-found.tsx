import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <Image src="/logo.png" alt="LEX Concursos" width={56} height={48} className="object-contain" />
      <p className="text-5xl font-bold text-primary">404</p>
      <h1 className="text-xl font-semibold text-foreground">Página não encontrada</h1>
      <p className="max-w-sm text-sm text-foreground-muted">O endereço pode estar errado ou a página foi removida.</p>
      <Link href="/"><Button>Voltar ao início</Button></Link>
    </div>
  );
}
