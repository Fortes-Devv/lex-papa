"use client";
import { Bell, Search, Moon, Sun, Menu } from "lucide-react";
import { useState, useEffect } from "react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Dropdown } from "@/components/ui/dropdown";
import { useCurrentUser } from "@/lib/store/hooks";

const PROFILE_PATH: Record<string, string> = {
  admin: "/admin/profile",
  moderator: "/admin/profile",
  teacher: "/teacher/profile",
  student: "/student/profile",
};

interface TopHeaderProps {
  onMenuToggle?: () => void;
  title?: string;
}

export function TopHeader({ onMenuToggle, title }: TopHeaderProps) {
  const user = useCurrentUser();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    setMounted(true);
    fetch("/api/notifications/count")
      .then((r) => r.json())
      .then((d) => setUnread(d.unread ?? 0))
      .catch(() => {});
  }, []);

  const dark = mounted && theme === "dark";
  function toggleTheme() {
    setTheme(dark ? "light" : "dark");
  }

  return (
    <header className="sticky top-0 z-[1100] flex h-14 items-center gap-3 border-b border-border bg-background/95 backdrop-blur-sm px-4">
      {/* Mobile menu toggle */}
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuToggle}>
        <Menu className="h-5 w-5" />
      </Button>

      {title && <h1 className="hidden sm:block text-sm font-semibold text-foreground">{title}</h1>}

      {/* Search */}
      <div className="flex-1 hidden md:flex">
        <button className="flex h-8 w-full max-w-xs items-center gap-2 rounded-md border border-border bg-muted px-3 text-sm text-foreground-muted hover:border-primary/40 hover:text-foreground transition-all duration-150">
          <Search className="h-3.5 w-3.5 shrink-0" />
          <span>Buscar...</span>
          <kbd className="ml-auto text-2xs bg-background border border-border rounded px-1.5 py-0.5">⌘K</kbd>
        </button>
      </div>

      <div className="ml-auto flex items-center gap-1">
        {/* Theme toggle */}
        <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-foreground-muted">
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        {/* Notifications */}
        <div className="relative">
          <Button variant="ghost" size="icon" className="text-foreground-muted">
            <Bell className="h-4 w-4" />
          </Button>
          {unread > 0 && (
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive border-2 border-background" />
          )}
        </div>

        {/* User menu */}
        <Dropdown
          align="right"
          trigger={
            <button className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted transition-colors duration-100">
              <Avatar src={user.avatar} name={user.name} size="sm" status="online" />
              <span className="hidden md:block text-sm font-medium text-foreground truncate max-w-[120px]">
                {user.name.split(" ")[0]}
              </span>
            </button>
          }
          items={[
            { label: "Meu perfil", onClick: () => router.push(PROFILE_PATH[user.role] ?? "/student/profile") },
            { separator: true },
            { label: "Sair", onClick: () => signOut({ callbackUrl: "/login" }), variant: "destructive" },
          ]}
        />
      </div>
    </header>
  );
}
