import {
  LayoutDashboard, Users, Package, BookOpen, ShoppingCart,
  DollarSign, Settings, ScrollText, Shield, BarChart2,
  Layers, Plug, Gamepad2, FileEdit, Globe
} from "lucide-react";
import { AreaShell } from "@/components/layout/area-shell";
import { requireArea } from "@/lib/auth-guards";

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
      { label: "Pedidos", href: "/admin/orders", icon: <ShoppingCart className="h-4 w-4" /> },
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

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireArea("admin");
  return <AreaShell label="Admin" sections={navSections}>{children}</AreaShell>;
}
