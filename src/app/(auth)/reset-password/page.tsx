"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Lock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { resetPassword } from "@/lib/actions/password-reset";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="text-center text-sm text-foreground-muted">Carregando...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const { error } = useToast();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [pwd, setPwd] = useState({ next: "", confirm: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pwd.next !== pwd.confirm) { error("As senhas não coincidem."); return; }
    setLoading(true);
    const result = await resetPassword(token, pwd.next);
    setLoading(false);
    if (!result.success) { error(result.error); return; }
    setDone(true);
  }

  if (!token) {
    return (
      <div className="space-y-4 text-center">
        <h1 className="text-xl font-semibold text-foreground">Link inválido</h1>
        <p className="text-sm text-foreground-muted">Este link de redefinição não é válido.</p>
        <Link href="/forgot-password" className="text-primary hover:underline text-sm">Solicitar novo link</Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto h-14 w-14 rounded-full bg-success-muted flex items-center justify-center">
          <CheckCircle2 className="h-7 w-7 text-success" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Senha redefinida!</h1>
          <p className="mt-2 text-sm text-foreground-muted">Você já pode entrar com sua nova senha.</p>
        </div>
        <Link href="/login"><Button className="w-full" size="lg">Ir para o login</Button></Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Nova senha</h1>
        <p className="text-sm text-foreground-muted">Escolha uma nova senha para sua conta.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Nova senha" type="password" placeholder="Mínimo 8 caracteres" value={pwd.next} onChange={(e) => setPwd((p) => ({ ...p, next: e.target.value }))} required leftIcon={<Lock className="h-4 w-4" />} />
        <Input label="Confirmar nova senha" type="password" placeholder="Repita a senha" value={pwd.confirm} onChange={(e) => setPwd((p) => ({ ...p, confirm: e.target.value }))} required leftIcon={<Lock className="h-4 w-4" />} />
        <Button type="submit" className="w-full" size="lg" loading={loading}>Redefinir senha</Button>
      </form>
    </div>
  );
}
