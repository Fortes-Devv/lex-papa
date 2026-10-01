import {
  LayoutDashboard, Users, Package, BookOpen, ShoppingCart,
  DollarSign, Settings, ScrollText, BarChart2, Plug,
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
    title: "Sistema",
    items: [
      { label: "Integrações", href: "/admin/integrations", icon: <Plug className="h-4 w-4" /> },
      { label: "Logs", href: "/admin/logs", icon: <ScrollText className="h-4 w-4" /> },
      { label: "Configurações", href: "/admin/settings", icon: <Settings className="h-4 w-4" /> },
    ],
  },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireArea("admin");
  return <AreaShell label="Admin" sections={navSections}>{children}</AreaShell>;
}
