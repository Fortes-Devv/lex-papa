import type { LucideIcon } from "lucide-react";
import {
  LayoutGrid, User, Package, BookOpen, ShoppingCart, DollarSign, BarChart3, Plug, List, Settings, Layers, FileVideo, Users,
} from "lucide-react";

// Navegação do admin e do professor (docs/Layout de módulos com preview/SPEC-navegacao.md).
// Cada seção define o item do trilho/barra e o painel contextual (busca, filtros, ação).

export interface NavFilter {
  label: string;
  param?: string; // ausente = "Todos" (sem filtro)
  value?: string;
  countKey: string; // chave em panelData[section].counts
}

export interface NavSection {
  id: string;
  label: string;
  shortLabel?: string; // rótulo curto da barra inferior / grade "Mais"
  href: string;
  icon: LucideIcon;
  group: "Visão geral" | "Gestão" | "Sistema" | "Conteúdo" | "Alunos" | "Performance";
  search?: { placeholder: string };
  filters?: NavFilter[];
  action?: { label: string; href: string };
  hint?: string; // texto do painel quando a seção ainda não tem filtros
}

export const ADMIN_SECTIONS: NavSection[] = [
  { id: "dashboard", label: "Dashboard", shortLabel: "Início", href: "/admin/dashboard", icon: LayoutGrid, group: "Visão geral", hint: "Resumo de vendas, alunos e atividade recente." },
  {
    id: "users", label: "Usuários", href: "/admin/users", icon: User, group: "Gestão",
    search: { placeholder: "Buscar usuário..." },
    filters: [
      { label: "Todos", countKey: "all" },
      { label: "Alunos", param: "papel", value: "student", countKey: "student" },
      { label: "Professores", param: "papel", value: "teacher", countKey: "teacher" },
      { label: "Admins", param: "papel", value: "admin", countKey: "admin" },
    ],
    action: { label: "Novo usuário", href: "/admin/users?novo=1" },
  },
  { id: "products", label: "Produtos", href: "/admin/products", icon: Package, group: "Gestão", hint: "Cursos e assinaturas à venda." },
  {
    id: "courses", label: "Cursos", href: "/admin/courses", icon: BookOpen, group: "Gestão",
    search: { placeholder: "Buscar curso..." },
    filters: [
      { label: "Todos os cursos", countKey: "all" },
      { label: "Publicados", param: "status", value: "published", countKey: "published" },
      { label: "Rascunhos", param: "status", value: "draft", countKey: "draft" },
    ],
    action: { label: "Novo curso", href: "/admin/courses?novo=1" },
  },
  {
    id: "orders", label: "Pedidos", href: "/admin/orders", icon: ShoppingCart, group: "Gestão",
    search: { placeholder: "Buscar pedido..." },
    filters: [
      { label: "Todos", countKey: "all" },
      { label: "Pendentes", param: "status", value: "pending", countKey: "pending" },
      { label: "Pagos", param: "status", value: "paid", countKey: "paid" },
      { label: "Cancelados", param: "status", value: "cancelled", countKey: "cancelled" },
    ],
  },
  { id: "financial", label: "Financeiro", href: "/admin/financial", icon: DollarSign, group: "Gestão", hint: "Receita, reembolsos e repasses." },
  { id: "analytics", label: "Analytics", href: "/admin/analytics", icon: BarChart3, group: "Gestão", hint: "Vendas e engajamento por curso." },
  { id: "integrations", label: "Integrações", href: "/admin/integrations", icon: Plug, group: "Sistema", hint: "Pagamentos, vídeo, e-mail e pixels." },
  { id: "logs", label: "Logs", href: "/admin/logs", icon: List, group: "Sistema", hint: "Quem fez o quê: exclusões, pagamentos, permissões." },
  { id: "settings", label: "Configurações", shortLabel: "Config.", href: "/admin/settings", icon: Settings, group: "Sistema", hint: "Dados da plataforma e preferências." },
];

// Barra inferior do celular (4 seções + "Mais").
export const ADMIN_BOTTOM = ["dashboard", "courses", "orders", "users"];

export const TEACHER_SECTIONS: NavSection[] = [
  { id: "dashboard", label: "Dashboard", shortLabel: "Início", href: "/teacher/dashboard", icon: LayoutGrid, group: "Visão geral", hint: "Resumo dos seus cursos e alunos." },
  { id: "courses", label: "Meus Cursos", shortLabel: "Cursos", href: "/teacher/courses", icon: BookOpen, group: "Conteúdo", hint: "Cursos em que você é instrutor." },
  { id: "modules", label: "Meus Módulos", shortLabel: "Módulos", href: "/teacher/modules", icon: Layers, group: "Conteúdo", hint: "Módulos que você leciona — o mesmo módulo pode estar em vários cursos." },
  { id: "content", label: "Editor de Aulas", shortLabel: "Editor", href: "/teacher/content", icon: FileVideo, group: "Conteúdo", hint: "Organize módulos, aulas e materiais." },
  { id: "students", label: "Alunos", href: "/teacher/students", icon: Users, group: "Alunos", hint: "Alunos matriculados nos seus cursos." },
  { id: "analytics", label: "Analytics", href: "/teacher/analytics", icon: BarChart3, group: "Performance", hint: "Desempenho dos seus cursos." },
];

export const TEACHER_BOTTOM = ["dashboard", "courses", "content", "students"];

export function activeSection(sections: NavSection[], pathname: string): NavSection | undefined {
  // Prefixo mais longo vence (ex.: /admin/courses/123 → Cursos).
  return [...sections].sort((a, b) => b.href.length - a.href.length).find((s) => pathname === s.href || pathname.startsWith(s.href + "/"));
}
