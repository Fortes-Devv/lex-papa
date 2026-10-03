"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { signIn, getSession } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { safeCallbackUrl } from "@/lib/safe-redirect";

const ROLE_HOME: Record<string, string> = {
  admin: "/admin/dashboard",
  moderator: "/admin/dashboard",
  teacher: "/teacher/dashboard",
  student: "/student/dashboard",
};
const inputCls = "h-12 w-full rounded-xl border border-border bg-card px-4 text-[15px] text-foreground outline-none placeholder:text-foreground-muted focus:border-brand focus:ring-2 focus:ring-brand/20";

// Entrar (modelo 7i). Se veio de "Comprar" (?callbackUrl=/checkout...), volta para lá depois do login.
export default function LoginPage() {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const [callback, setCallback] = useState<string | null>(null);

  useEffect(() => {
    setCallback(safeCallbackUrl(new URLSearchParams(window.location.search).get("callbackUrl")));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await signIn("credentials", { email: form.email, password: form.password, redirect: false });
      if (result?.error) {
        error(result.code === "rate_limited" ? "Muitas tentativas de login. Aguarde 15 minutos e tente novamente." : "E-mail ou senha inválidos.");
        setLoading(false);
        return;
      }
      const session = await getSession();
      success(`Bem-vindo de volta, ${session?.user?.name?.split(" ")[0] ?? ""}!`);
      window.location.href = callback ?? ROLE_HOME[session?.user?.role ?? "student"] ?? "/student/dashboard";
    } catch {
      error("Erro ao fazer login. Tente novamente.");
      setLoading(false);
    }
  }

  const registerHref = callback ? `/register?callbackUrl=${encodeURIComponent(callback)}` : "/register";

  return (
    <div className="space-y-6">
      <div className="flex justify-center lg:hidden">
        <span className="grid h-16 w-16 place-items-center rounded-2xl bg-navy"><Image src="/logo.png" alt="LEX Concursos" width={48} height={41} className="object-contain" priority /></span>
      </div>

      <div>
        <h1 className="text-[28px] font-extrabold tracking-tight text-foreground">Entrar</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          {callback?.startsWith("/checkout") ? "Entre para finalizar sua compra." : <>Ainda não tem conta? <Link href="/course" className="font-semibold text-brand">Veja os cursos</Link></>}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-semibold text-foreground">E-mail</span>
          <input className={inputCls} type="email" placeholder="voce@email.com" autoComplete="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
        </label>
        <label className="block">
          <span className="mb-1.5 flex items-center justify-between text-[13px] font-semibold text-foreground">
            Senha
            <Link href="/forgot-password" className="text-[13px] font-semibold text-brand">Esqueci a senha</Link>
          </span>
          <span className="relative block">
            <input className={`${inputCls} pr-20`} type={showPwd ? "text" : "password"} placeholder="••••••••" autoComplete="current-password" required value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
            <button type="button" onClick={() => setShowPwd((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-foreground-muted hover:text-foreground">
              {showPwd ? "ocultar" : "mostrar"}
            </button>
          </span>
        </label>
        <button type="submit" disabled={loading} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand text-[15px] font-bold text-white shadow-[0_6px_16px_rgba(242,106,27,.3)] hover:bg-brand-dark disabled:opacity-70">
          {loading && <Loader2 className="h-5 w-5 animate-spin" />} Entrar
        </button>
      </form>

      <div className="flex items-center gap-3 text-xs text-foreground-muted"><span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" /></div>

      <Link href={registerHref} className="flex h-12 w-full items-center justify-center rounded-xl border border-line-strong bg-card text-[15px] font-bold text-foreground hover:bg-background dark:border-white/10">
        Criar conta grátis
      </Link>
    </div>
  );
}
