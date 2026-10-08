import type { LucideIcon } from "lucide-react";
import {
  LayoutGrid, User, Package, GraduationCap, BookOpen, ShoppingCart, DollarSign, BarChart3, Plug, List, Settings, Layers, FileVideo, Users,
} from "lucide-react";

// Navegação do admin e do professor (docs/Layout de módulos com preview/SPEC-navegacao.md).
// Cada seção define o item do trilho/barra e o painel contextual (busca, filtros, ação).

export interface NavFilter {
  label: string;
  param?: string; // ausente = "Todos" (sem filtro)
  value?: string;
  countKey?: string; // chave em panelData[section].counts (sem contador se ausente)
  isDefault?: boolean; // marcado quando a URL não tem este parâmetro
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
  filtersTitle?: string; // ex.: "Período", "Tipo"
  filterGroups?: { title: string; filters: NavFilter[] }[]; // grupos extras (combinam com o principal)
  shortcuts?: { label: string; href: string }[]; // "Atalhos" no painel
  action?: { label: string; href: string };
  hint?: string; // texto do painel quando a seção ainda não tem filtros
}

export const ADMIN_SECTIONS: NavSection[] = [
  {
    id: "dashboard", label: "Dashboard", shortLabel: "Início", href: "/admin/dashboard", icon: LayoutGrid, group: "Visão geral",
    filtersTitle: "Período",
    filters: [
      { label: "Hoje", param: "periodo", value: "hoje" },
      { label: "Últimos 7 dias", param: "periodo", value: "7d", isDefault: true },
      { label: "Últimos 30 dias", param: "periodo", value: "30d" },
      { label: "Este ano", param: "periodo", value: "ano" },
    ],
    shortcuts: [
      { label: "Novo curso", href: "/admin/courses?novo=1" },
      { label: "Novo usuário", href: "/admin/users?novo=1" },
    ],
  },
  {
    id: "users", label: "Usuários", href: "/admin/users", icon: User, group: "Gestão",
    search: { placeholder: "Buscar usuário..." },
    filters: [
      { label: "Todos", param: "papel", countKey: "all" },
      { label: "Alunos (com curso)", param: "papel", value: "aluno", countKey: "aluno" },
      { label: "Cadastrados (sem compra)", param: "papel", value: "cadastrado", countKey: "cadastrado" },
      { label: "Assinantes", param: "papel", value: "assinante", countKey: "assinante" },
      { label: "Acesso encerrado", param: "papel", value: "encerrado", countKey: "encerrado" },
      { label: "Equipe (admin)", param: "papel", value: "equipe", countKey: "equipe" },
    ],
    filtersTitle: "Quem é",
    filterGroups: [{
      title: "Status",
      filters: [
        { label: "Ativos", param: "situacao", value: "active", countKey: "active" },
        { label: "Inativos", param: "situacao", value: "inactive", countKey: "inactive" },
        { label: "Bloqueados", param: "situacao", value: "banned", countKey: "banned" },
      ],
    }],
    action: { label: "Novo usuário", href: "/admin/users?novo=1" },
  },
  {
    id: "products", label: "Produtos", href: "/admin/products", icon: Package, group: "Gestão",
    search: { placeholder: "Buscar produto..." },
    filters: [
      { label: "Todos", param: "status", countKey: "all" },
      { label: "Ativos", param: "status", value: "ativo", countKey: "active" },
      { label: "Inativos", param: "status", value: "inativo", countKey: "inactive" },
    ],
    filterGroups: [{
      title: "Tipo",
      filters: [
        { label: "Curso completo", param: "tipo", value: "course", countKey: "course" },
        { label: "Pacote", param: "tipo", value: "bundle", countKey: "bundle" },
        { label: "Assinatura", param: "tipo", value: "subscription", countKey: "subscription" },
      ],
    }],
    action: { label: "Novo curso", href: "/admin/products?novo=1" },
  },
  {
    id: "courses", label: "Cursos", href: "/admin/courses", icon: BookOpen, group: "Gestão",
    search: { placeholder: "Buscar curso..." },
    filters: [
      { label: "Todos os cursos", param: "status", countKey: "all" },
      { label: "Publicados", param: "status", value: "published", countKey: "published" },
      { label: "Rascunhos", param: "status", value: "draft", countKey: "draft" },
    ],
    action: { label: "Novo curso", href: "/admin/courses?novo=1" },
  },
  {
    id: "teachers", label: "Professores", shortLabel: "Profs.", href: "/admin/teachers", icon: GraduationCap, group: "Gestão",
    hint: "Só crédito nos módulos: nome, foto e minibio. Professor não é usuário e não faz login.",
    filters: [],
  },
  {
    id: "orders", label: "Pedidos", href: "/admin/orders", icon: ShoppingCart, group: "Gestão",
    search: { placeholder: "Buscar pedido..." },
    filters: [
      { label: "Todos", countKey: "all" },
      { label: "Pendentes", param: "status", value: "pending", countKey: "pending" },
      { label: "Pagos", param: "status", value: "paid", countKey: "paid" },
      { label: "Cancelados", param: "status", value: "cancelled", countKey: "cancelled" },
      { label: "Reembolsados", param: "status", value: "refunded", countKey: "refunded" },
    ],
    filtersTitle: "Status",
    filterGroups: [{
      title: "Período",
      filters: [
        { label: "Hoje", param: "periodo", value: "hoje" },
        { label: "7 dias", param: "periodo", value: "7d" },
        { label: "30 dias", param: "periodo", value: "30d" },
      ],
    }],
  },
  {
    id: "financial", label: "Financeiro", href: "/admin/financial", icon: DollarSign, group: "Gestão",
    filtersTitle: "Período",
    filters: [
      { label: "Mês atual", param: "mes", value: "atual", isDefault: true },
      { label: "Mês anterior", param: "mes", value: "anterior" },
      { label: "Este ano", param: "mes", value: "ano" },
    ],
    filterGroups: [{
      title: "Visões",
      filters: [
        { label: "Formas de pagamento", param: "visao", value: "pagamentos" },
        { label: "Cupons", param: "visao", value: "cupons" },
      ],
    }],
  },
  {
    id: "analytics", label: "Analytics", href: "/admin/analytics", icon: BarChart3, group: "Gestão",
    filtersTitle: "Relatórios",
    filters: [
      { label: "Engajamento", param: "relatorio", value: "engajamento", isDefault: true },
      { label: "Visão geral", param: "relatorio", value: "geral" },
    ],
    filterGroups: [{
      title: "Período",
      filters: [
        { label: "7 dias", param: "dias", value: "7" },
        { label: "30 dias", param: "dias", value: "30", isDefault: true },
      ],
    }],
  },
  {
    id: "integrations", label: "Integrações", href: "/admin/integrations", icon: Plug, group: "Sistema",
    filters: [
      { label: "Todas", param: "status" },
      { label: "Conectadas", param: "status", value: "conectadas" },
      { label: "Com erro", param: "status", value: "erro" },
      { label: "Não configuradas", param: "status", value: "pendentes" },
    ],
    filterGroups: [{
      title: "Categoria",
      filters: [
        { label: "Pagamentos", param: "categoria", value: "pagamentos" },
        { label: "Vídeo e arquivos", param: "categoria", value: "video" },
        { label: "E-mail", param: "categoria", value: "email" },
        { label: "Marketing", param: "categoria", value: "marketing" },
      ],
    }],
  },
  {
    id: "logs", label: "Logs", href: "/admin/logs", icon: List, group: "Sistema",
    search: { placeholder: "Mensagem, usuário, ID..." },
    filters: [
      { label: "Todos", param: "nivel" },
      { label: "Erros", param: "nivel", value: "erro" },
      { label: "Avisos", param: "nivel", value: "aviso" },
      { label: "Info", param: "nivel", value: "info" },
    ],
    filterGroups: [{
      title: "Origem",
      filters: [
        { label: "Pagamentos", param: "origem", value: "pagamentos" },
        { label: "Conteúdo", param: "origem", value: "conteudo" },
        { label: "Usuários", param: "origem", value: "usuarios" },
        { label: "Sistema", param: "origem", value: "sistema" },
      ],
    }],
  },
  {
    id: "settings", label: "Configurações", shortLabel: "Config.", href: "/admin/settings", icon: Settings, group: "Sistema",
    filters: [
      { label: "Geral", param: "secao", value: "geral", isDefault: true },
      { label: "Área do aluno", param: "secao", value: "aluno" },
      { label: "Integrações", param: "secao", value: "integracoes" },
      { label: "Empresa", param: "secao", value: "empresa" },
      { label: "Pagamentos", param: "secao", value: "pagamentos" },
      { label: "Equipe", param: "secao", value: "equipe" },
      { label: "Segurança", param: "secao", value: "seguranca" },
    ],
  },
];

// Barra inferior do celular (4 seções + "Mais").
export const ADMIN_BOTTOM = ["dashboard", "courses", "orders", "users"];


export function activeSection(sections: NavSection[], pathname: string): NavSection | undefined {
  // Prefixo mais longo vence (ex.: /admin/courses/123 → Cursos).
  return [...sections].sort((a, b) => b.href.length - a.href.length).find((s) => pathname === s.href || pathname.startsWith(s.href + "/"));
}
