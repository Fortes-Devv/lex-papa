"use client";
import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { TopHeader } from "@/components/layout/top-header";
import { AosProvider } from "@/components/providers/aos-provider";
import { cn } from "@/lib/utils/cn";

type NavSections = React.ComponentProps<typeof SidebarNav>["sections"];

// Casca visual das áreas (sidebar recolhível + header). A checagem de acesso
// fica no layout (Server Component) que renderiza este componente.
export function AreaShell({
  label, sections, withAos = false, children,
}: {
  label: string;
  sections: NavSections;
  withAos?: boolean;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {withAos && <AosProvider />}
      {mobileOpen && <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />}

      <aside className={cn(
        "fixed lg:relative z-50 lg:z-auto flex flex-col h-full bg-sidebar border-r border-sidebar-border transition-all duration-200",
        collapsed ? "w-[60px]" : "w-[240px]",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className={cn("flex h-14 items-center border-b border-sidebar-border shrink-0", collapsed ? "justify-center px-3" : "gap-2 px-4")}>
          <Image src="/logo.png" alt="LEX Concursos" width={47} height={40} className="object-contain shrink-0" priority />
          {!collapsed && <span className="text-2xs font-medium text-foreground-muted uppercase tracking-wide">{label}</span>}
        </div>

        <div className="flex-1 overflow-y-auto py-4 no-scrollbar">
          <SidebarNav sections={sections} collapsed={collapsed} />
        </div>

        <div className="border-t border-sidebar-border p-2 shrink-0">
          <button onClick={() => setCollapsed((c) => !c)} className={cn("flex h-8 w-full items-center rounded-md text-foreground-muted hover:bg-muted hover:text-foreground transition-colors text-sm gap-2", collapsed ? "justify-center" : "px-3")}>
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <><ChevronLeft className="h-4 w-4" /><span className="text-xs">Recolher</span></>}
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <TopHeader onMenuToggle={() => setMobileOpen((o) => !o)} />
        {/* relative: elementos absolutos das páginas ficam presos aqui (senão esticam o documento e criam uma 2ª rolagem) */}
        <main className="relative flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
