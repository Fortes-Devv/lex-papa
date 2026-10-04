import type { Metadata } from "next";
import { SignOutButton } from "./sign-out-button";

export const metadata: Metadata = { title: "Sem acesso" };

// Para quem ainda tinha sessão aberta como professor: o acesso foi encerrado.
export default function NoAccessPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
      <h1 className="text-[22px] font-extrabold text-foreground">Esta conta não tem acesso à plataforma</h1>
      <p className="max-w-sm text-sm text-foreground-muted">Os conteúdos agora são administrados pela equipe da LEX. Se precisar de algo, fale com o administrador.</p>
      <SignOutButton />
    </div>
  );
}
