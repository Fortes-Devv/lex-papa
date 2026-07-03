export const dynamic = "force-dynamic";
import Link from "next/link";
import { BookOpen, Package, Users, Tag, FileText, ShoppingCart, DollarSign, BarChart2, Award, Puzzle, Settings, ChevronRight } from "lucide-react";
import { db } from "@/lib/db";

export default async function ContentStudioPage() {
  // Sequencial de propósito: o driver WebSocket da Neon rejeita rajadas
  // grandes de queries paralelas (esta é uma tela de hub, não hot path).
  const courses = await db.product.count({ where: { type: "course" } });
  const products = await db.product.count();
  const users = await db.user.count();
  const categories = await db.category.count();
  const pages = await db.cMSPage.count();
  const articles = await db.article.count();
  const orders = await db.order.count();

  const modules = [
    { href: "/admin/courses", label: "Cursos", description: "Criar e editar cursos, módulos e aulas", icon: <BookOpen className="h-5 w-5" />, color: "text-primary", bg: "bg-primary/10", badge: `${courses} cursos` },
    { href: "/admin/products", label: "Produtos", description: "Gerenciar todos os produtos", icon: <Package className="h-5 w-5" />, color: "text-success", bg: "bg-success/10", badge: `${products} ativos` },
    { href: "/admin/users", label: "Usuários", description: "Alunos, professores e admins", icon: <Users className="h-5 w-5" />, color: "text-info", bg: "bg-info/10", badge: `${users}` },
    { href: "/admin/cms", label: "Páginas & Blog", description: "Páginas estáticas e artigos", icon: <FileText className="h-5 w-5" />, color: "text-violet-500", bg: "bg-violet-500/10", badge: `${pages + articles}` },
    { href: "/admin/orders", label: "Pedidos", description: "Vendas e reembolsos", icon: <ShoppingCart className="h-5 w-5" />, color: "text-orange-500", bg: "bg-orange-500/10", badge: `${orders}` },
    { href: "/admin/financial", label: "Financeiro", description: "Receitas, cupons e pagamentos", icon: <DollarSign className="h-5 w-5" />, color: "text-emerald-500", bg: "bg-emerald-500/10", badge: null },
    { href: "/admin/analytics", label: "Analytics", description: "Métricas de performance", icon: <BarChart2 className="h-5 w-5" />, color: "text-cyan-500", bg: "bg-cyan-500/10", badge: null },
    { href: "/admin/gamification", label: "Gamificação", description: "XP, conquistas e rankings", icon: <Award className="h-5 w-5" />, color: "text-yellow-500", bg: "bg-yellow-500/10", badge: null },
    { href: "/admin/integrations", label: "Integrações", description: "Analytics, pixels e serviços", icon: <Puzzle className="h-5 w-5" />, color: "text-foreground-muted", bg: "bg-muted", badge: null },
    { href: "/admin/settings", label: "Configurações", description: "Nome, moeda e integrações", icon: <Settings className="h-5 w-5" />, color: "text-foreground-muted", bg: "bg-muted", badge: null },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Content Studio</h1>
        <p className="text-sm text-foreground-muted mt-0.5">Acesso rápido a todas as áreas de gestão</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map((m) => (
          <Link key={m.label} href={m.href} className="group rounded-lg border border-border bg-card p-4 flex items-start gap-3 hover:border-primary/30 hover:shadow-md transition-all">
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${m.bg} ${m.color}`}>{m.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">{m.label}</p>
                <ChevronRight className="h-4 w-4 text-foreground-subtle group-hover:text-primary transition-colors" />
              </div>
              <p className="text-xs text-foreground-muted mt-0.5">{m.description}</p>
              {m.badge && <span className="text-2xs text-foreground-subtle mt-1 inline-block">{m.badge}</span>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
