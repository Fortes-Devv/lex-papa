"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { signIn } from "next-auth/react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { registerUser } from "@/lib/actions/auth";

export default function RegisterPage() {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  const strength = (() => {
    const p = form.password;
    let s = 0;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  })();

  const strengthLabels = ["", "Fraca", "Razoável", "Boa", "Forte"];
  const strengthColors = ["", "bg-destructive", "bg-warning", "bg-info", "bg-success"];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (strength < 2) { error("Use uma senha mais forte."); return; }
    setLoading(true);
    try {
      const result = await registerUser(form);
      if (!result.success) {
        error(result.error);
        return;
      }
      await signIn("credentials", { email: form.email, password: form.password, redirect: false });
      success("Conta criada com sucesso!");
      window.location.href = "/student/dashboard";
    } catch {
      error("Erro ao criar conta. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="lg:hidden flex justify-center mb-2">
        <Image src="/logo.png" alt="LEX Concursos" width={82} height={70} className="object-contain" priority />
      </div>

      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Criar sua conta</h1>
        <p className="text-sm text-foreground-muted">Comece agora sua preparação para o concurso.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Nome completo" placeholder="Seu nome" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
        <Input label="Email" type="email" placeholder="voce@email.com" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
        <div className="space-y-2">
          <Input label="Senha" type="password" placeholder="Mínimo 8 caracteres" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} required />
          {form.password && (
            <div className="space-y-1.5">
              <div className="flex gap-1">
                {[1,2,3,4].map((i) => (
                  <div key={i} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${i <= strength ? strengthColors[strength] : "bg-muted"}`} />
                ))}
              </div>
              <p className="text-xs text-foreground-muted">Força: <span className="font-medium text-foreground">{strengthLabels[strength]}</span></p>
            </div>
          )}
        </div>

        <div className="space-y-2 text-xs text-foreground-muted">
          {[
            { ok: form.password.length >= 8, text: "Mínimo 8 caracteres" },
            { ok: /[A-Z]/.test(form.password), text: "Uma letra maiúscula" },
            { ok: /[0-9]/.test(form.password), text: "Um número" },
          ].map(({ ok, text }) => (
            <div key={text} className="flex items-center gap-1.5">
              <Check className={`h-3 w-3 transition-colors ${ok ? "text-success" : "text-border"}`} />
              <span className={ok ? "text-foreground" : ""}>{text}</span>
            </div>
          ))}
        </div>

        <label className="flex items-start gap-2 text-sm text-foreground-muted cursor-pointer">
          <input type="checkbox" required className="mt-0.5 rounded border-border" />
          <span>
            Concordo com os{" "}
            <Link href="/termos" className="text-primary hover:underline">Termos de Uso</Link>
            {" "}e{" "}
            <Link href="/privacidade" className="text-primary hover:underline">Política de Privacidade</Link>
          </span>
        </label>

        <Button type="submit" className="w-full" size="lg" loading={loading}>Criar conta</Button>
      </form>

      <p className="text-center text-sm text-foreground-muted">
        Já tem conta?{" "}
        <Link href="/login" className="text-primary font-medium hover:underline">Entrar</Link>
      </p>
    </div>
  );
}
