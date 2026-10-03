"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { Home, BookOpen, BarChart3, LayoutGrid, User, Search, Flame } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Dropdown } from "@/components/ui/dropdown";
import { AosProvider } from "@/components/providers/aos-provider";
import { useInstallApp } from "@/components/pwa/pwa";
import { InstallHelp } from "@/components/pwa/install-banner";
import { useCurrentUser } from "@/lib/store/hooks";
import { cn } from "@/lib/utils/cn";

// Navegação do aluno (modelos 7 e 8): topo leve no desktop (sem sidebar)
// e barra inferior no celular: Início · Curso · Progresso · Cursos · Perfil.
const TABS = [
  { href: "/student/dashboard", label: "Início", short: "Início", icon: Home },
  { href: "/student/course", label: "Meu curso", short: "Curso", icon: BookOpen },
  { href: "/student/progress", label: "Progresso", short: "Progresso", icon: BarChart3 },
  { href: "/student/explore", label: "Cursos", short: "Cursos", icon: LayoutGrid },
];
const BOTTOM = [...TABS, { href: "/student/profile", label: "Perfil", short: "Perfil", icon: User }];

// "Meus cursos", "Favoritos" e "Comunidade" contam como parte de Cursos/Perfil para o destaque.
function isActive(pathname: string, href: string) {
  if (href === "/student/explore") return pathname.startsWith("/student/explore") || pathname.startsWith("/student/favorites");
  if (href === "/student/course") return pathname.startsWith("/student/course") || pathname.startsWith("/student/library");
  if (href === "/student/profile") return pathname.startsWith("/student/profile") || pathname.startsWith("/student/community");
  return pathname.startsWith(href);
}

export function StudentShell({ streak, unread, children }: { streak: number; unread: number; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useCurrentUser();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");
  const { mode: installMode, install } = useInstallApp();
  const [iosHelp, setIosHelp] = useState(false);
  useEffect(() => setMounted(true), []);
  const dark = mounted && theme === "dark";

  const accountMenu = [
    { label: "Meu perfil", href: "/student/profile" },
    { label: "Meus cursos", href: "/student/library" },
    { label: "Favoritos", href: "/student/favorites" },
    { label: "Comunidade", href: "/student/community" },
    { label: unread > 0 ? `Notificações (${unread})` : "Notificações", href: "/student/profile?secao=notificacoes" },
    { label: dark ? "Tema claro" : "Tema escuro", onClick: () => setTheme(dark ? "light" : "dark") },
    ...(installMode ? [{ label: "Instalar app", onClick: () => (installMode === "android" ? void install() : setIosHelp(true)) }] : []),
    { separator: true as const },
    { label: "Sair", onClick: () => signOut({ callbackUrl: "/login" }), variant: "destructive" as const },
  ];

  const streakChip = streak > 0 && (
    <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-bold text-brand-dark dark:bg-brand/15 dark:text-brand">
      <Flame className="h-3.5 w-3.5" /> {streak} {streak === 1 ? "dia" : "dias"}
    </span>
  );
  const avatar = (
    <Dropdown
      align="right"
      trigger={
        <button type="button" aria-label="Minha conta" className="relative rounded-full outline-none focus-visible:ring-2 focus-visible:ring-brand">
          <Avatar src={user.avatar} name={user.name} size="md" />
          {unread > 0 && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-brand" />}
        </button>
      }
      items={accountMenu}
    />
  );

  return (
    <div className="min-h-screen bg-background">
      <AosProvider />
      <InstallHelp open={iosHelp} onClose={() => setIosHelp(false)} />

      {/* Topo */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1240px] items-center gap-3 px-4 lg:h-16 lg:gap-6 lg:px-8">
          <Link href="/student/dashboard" className="flex shrink-0 items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-navy">
              <Image src="/logo.png" alt="" width={26} height={22} className="object-contain" priority />
            </span>
            <span className="text-[15px] font-extrabold text-foreground">Lex Concursos</span>
          </Link>

          <nav className="hidden h-full items-stretch gap-1 lg:flex" aria-label="Área do aluno">
            {TABS.map((t) => {
              const active = isActive(pathname, t.href);
              return (
                <Link key={t.href} href={t.href} aria-current={active ? "page" : undefined}
                  className={cn("flex items-center border-b-2 px-3 text-sm font-semibold transition-colors", active ? "border-brand text-foreground" : "border-transparent text-foreground-muted hover:text-foreground")}>
                  {t.label}
                </Link>
              );
            })}
          </nav>

          <form
            role="search"
            className="ml-auto hidden max-w-[260px] flex-1 md:flex"
            onSubmit={(e) => { e.preventDefault(); if (query.trim()) router.push(`/student/course?q=${encodeURIComponent(query.trim())}`); }}
          >
            <label className="flex h-9 w-full items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm text-foreground-muted focus-within:border-brand">
              <Search className="h-4 w-4 shrink-0" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar aula..." className="w-full bg-transparent text-foreground outline-none placeholder:text-foreground-muted" />
            </label>
          </form>

          <div className="ml-auto flex items-center gap-2.5 md:ml-0">
            {streakChip}
            {avatar}
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-[1240px] px-4 pb-28 pt-5 lg:px-8 lg:pb-12 lg:pt-7">{children}</main>

      {/* Barra inferior (celular) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] lg:hidden" aria-label="Área do aluno">
        <div className="grid grid-cols-5">
          {BOTTOM.map((t) => {
            const active = isActive(pathname, t.href);
            const Icon = t.icon;
            return (
              <Link key={t.href} href={t.href} aria-current={active ? "page" : undefined}
                className={cn("flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold", active ? "text-brand" : "text-foreground-muted")}>
                <Icon className="h-5 w-5" />
                {t.short}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
