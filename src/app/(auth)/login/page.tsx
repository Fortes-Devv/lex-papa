"use client";
import { useState } from "react";
import Link from "next/link";
import { signIn, getSession } from "next-auth/react";
import { Eye, EyeOff, Chrome, Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

const ROLE_HOME: Record<string, string> = {
  admin: "/admin/dashboard",
  moderator: "/admin/dashboard",
  teacher: "/teacher/dashboard",
  student: "/student/dashboard",
};

export default function LoginPage() {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [form, setForm] = useState({ email: "carlos@lexconcursos.com.br", password: "123456" });

  const DEMO_PROFILES = [
    { label: "Admin", email: "carlos@lexconcursos.com.br", color: "text-primary" },
    { label: "Professor", email: "ricardo@lexconcursos.com.br", color: "text-success" },
    { label: "Aluno", email: "mariana@email.com", color: "text-warning" },
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });
      if (result?.error) {
        error("Email ou senha inválidos.");
        return;
      }
      const session = await getSession();
      const role = session?.user?.role ?? "student";
      success(`Bem-vindo de volta, ${session?.user?.name?.split(" ")[0] ?? ""}!`);
      window.location.href = ROLE_HOME[role] ?? "/student/dashboard";
    } catch {
      error("Erro ao fazer login. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Entrar na plataforma</h1>
        <p className="text-sm text-foreground-muted">Use sua conta ou faça login com um provedor social.</p>
      </div>

      {/* Social */}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" size="default" leftIcon={<Chrome className="h-4 w-4" />} type="button">
          Google
        </Button>
        <Button variant="outline" size="default" leftIcon={<Github className="h-4 w-4" />} type="button">
          GitHub
        </Button>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-background px-3 text-foreground-muted">ou continue com email</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email"
          type="email"
          placeholder="voce@email.com"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          required
          autoComplete="email"
        />
        <Input
          label="Senha"
          type={showPwd ? "text" : "password"}
          placeholder="••••••••"
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          required
          autoComplete="current-password"
          rightIcon={
            <button type="button" onClick={() => setShowPwd((v) => !v)} className="hover:text-foreground transition-colors">
              {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
        />

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 cursor-pointer text-foreground-muted">
            <input type="checkbox" className="rounded border-border" />
            Lembrar de mim
          </label>
          <Link href="/forgot-password" className="text-primary hover:underline font-medium text-sm">
            Esqueci a senha
          </Link>
        </div>

        <Button type="submit" className="w-full" size="lg" loading={loading}>
          Entrar
        </Button>
      </form>

      <p className="text-center text-sm text-foreground-muted">
        Não tem conta?{" "}
        <Link href="/register" className="text-primary font-medium hover:underline">
          Criar conta grátis
        </Link>
      </p>

      {/* Demo quick-access */}
      <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2">
        <p className="text-xs font-medium text-foreground">Acesso rápido — Demo:</p>
        <div className="grid grid-cols-3 gap-2">
          {DEMO_PROFILES.map((p) => (
            <button
              key={p.email}
              type="button"
              onClick={() => setForm({ email: p.email, password: "123456" })}
              className={`rounded-md border border-border bg-background px-2 py-1.5 text-xs font-medium transition-colors hover:border-primary/50 hover:bg-primary/5 ${p.color}`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <p className="text-2xs text-foreground-subtle">Clique para preencher · Senha: 123456</p>
      </div>
    </div>
  );
}
