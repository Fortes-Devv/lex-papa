"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  LayoutDashboard, Users, Package, BookOpen, ShoppingCart,
  DollarSign, Settings, ScrollText, Shield, BarChart2,
  Layers, Plug, Gamepad2, Database, ChevronLeft, ChevronRight,
  FileEdit, Globe
} from "lucide-react";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { TopHeader } from "@/components/layout/top-header";
import { cn } from "@/lib/utils/cn";

const navSections = [
  {
    items: [
      { label: "Dashboard", href: "/admin/dashboard", icon: <LayoutDashboard className="h-4 w-4" />, exact: true },
    ],
  },
  {
    title: "Gestão",
    items: [
      { label: "Usuários", href: "/admin/users", icon: <Users className="h-4 w-4" /> },
      { label: "Produtos", href: "/admin/products", icon: <Package className="h-4 w-4" /> },
      { label: "Cursos", href: "/admin/courses", icon: <BookOpen className="h-4 w-4" /> },
      { label: "Pedidos", href: "/admin/orders", icon: <ShoppingCart className="h-4 w-4" />, badge: 3 },
      { label: "Financeiro", href: "/admin/financial", icon: <DollarSign className="h-4 w-4" /> },
      { label: "Analytics", href: "/admin/analytics", icon: <BarChart2 className="h-4 w-4" /> },
    ],
  },
  {
    title: "Conteúdo",
    items: [
      { label: "CMS", href: "/admin/cms", icon: <FileEdit className="h-4 w-4" /> },
      { label: "Content Studio", href: "/admin/content-studio", icon: <Layers className="h-4 w-4" /> },
      { label: "Landing Pages", href: "/admin/cms/pages", icon: <Globe className="h-4 w-4" /> },
    ],
  },
  {
    title: "Sistema",
    items: [
      { label: "Integrações", href: "/admin/integrations", icon: <Plug className="h-4 w-4" /> },
      { label: "Gamificação", href: "/admin/gamification", icon: <Gamepad2 className="h-4 w-4" /> },
      { label: "Permissões", href: "/admin/settings/permissions", icon: <Shield className="h-4 w-4" /> },
      { label: "Logs", href: "/admin/logs", icon: <ScrollText className="h-4 w-4" /> },
      { label: "Configurações", href: "/admin/settings", icon: <Settings className="h-4 w-4" /> },
    ],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:relative z-50 lg:z-auto flex flex-col h-full bg-sidebar border-r border-sidebar-border transition-all duration-200",
          collapsed ? "w-[60px]" : "w-[240px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className={cn("flex h-14 items-center border-b border-sidebar-border shrink-0", collapsed ? "justify-center px-3" : "gap-2 px-4")}>
          <Image src="/logo.png" alt="LEX Concursos" width={47} height={40} className="object-contain shrink-0" priority />
          {!collapsed && <span className="text-2xs font-medium text-foreground-muted uppercase tracking-wide">Admin</span>}
        </div>

        {/* Nav */}
        <div className="flex-1 overflow-y-auto py-4 no-scrollbar">
          <SidebarNav sections={navSections} collapsed={collapsed} />
        </div>

        {/* Collapse toggle */}
        <div className="border-t border-sidebar-border p-2 shrink-0">
          <button
            onClick={() => setCollapsed((c) => !c)}
            className={cn(
              "flex h-8 w-full items-center rounded-md text-foreground-muted hover:bg-muted hover:text-foreground transition-colors duration-100 text-sm gap-2",
              collapsed ? "justify-center" : "px-3"
            )}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : (
              <>
                <ChevronLeft className="h-4 w-4" />
                <span className="text-xs">Recolher</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <TopHeader onMenuToggle={() => setMobileOpen((o) => !o)} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
