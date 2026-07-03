"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { requestPasswordReset } from "@/lib/actions/password-reset";

export default function ForgotPasswordPage() {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const result = await requestPasswordReset(email);
    setLoading(false);
    if (!result.success) {
      error(result.error);
      return;
    }
    setSent(true);
    success("Se o email existir, enviamos um link de recuperação.");
  }

  if (sent) {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto h-14 w-14 rounded-full bg-success-muted flex items-center justify-center">
          <Mail className="h-7 w-7 text-success" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Email enviado!</h1>
          <p className="mt-2 text-sm text-foreground-muted">
            Enviamos um link de recuperação para <strong>{email}</strong>.<br />
            Verifique também sua caixa de spam.
          </p>
        </div>
        <Button variant="outline" className="w-full" onClick={() => setSent(false)}>Reenviar email</Button>
        <Link href="/login" className="block text-sm text-primary hover:underline">Voltar ao login</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao login
      </Link>

      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Recuperar senha</h1>
        <p className="text-sm text-foreground-muted">Digite seu email e enviaremos um link para redefinir sua senha.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email cadastrado"
          type="email"
          placeholder="voce@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          leftIcon={<Mail className="h-4 w-4" />}
        />
        <Button type="submit" className="w-full" size="lg" loading={loading}>
          Enviar link de recuperação
        </Button>
      </form>
    </div>
  );
}
