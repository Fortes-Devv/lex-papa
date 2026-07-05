"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { signIn, getSession } from "next-auth/react";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
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
  const [form, setForm] = useState({ email: "", password: "" });

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
      {/* Logo (mobile) */}
      <div className="lg:hidden flex justify-center mb-2">
        <Image src="/logo.png" alt="LEX Concursos" width={82} height={70} className="object-contain" priority />
      </div>

      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Entrar na plataforma</h1>
        <p className="text-sm text-foreground-muted">Acesse sua conta para continuar seus estudos.</p>
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
          leftIcon={<Mail className="h-4 w-4" />}
        />
        <Input
          label="Senha"
          type={showPwd ? "text" : "password"}
          placeholder="••••••••"
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          required
          autoComplete="current-password"
          leftIcon={<Lock className="h-4 w-4" />}
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
    </div>
  );
}
