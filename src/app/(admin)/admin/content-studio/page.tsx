"use client";
import { useState } from "react";
import {
  Layout, BookOpen, Package, Globe, FileText, Image, Mail, Tag, Settings,
  Award, Search, Palette, Menu, BarChart2, Puzzle, ChevronRight, Plus, Check
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils/cn";

const modules = [
  { id: "courses", label: "Cursos", description: "Criar e editar cursos, módulos e aulas", icon: <BookOpen className="h-5 w-5" />, color: "text-primary", bg: "bg-primary/10", badge: "8 cursos" },
  { id: "products", label: "Produtos", description: "Gerenciar todos os tipos de produtos", icon: <Package className="h-5 w-5" />, color: "text-success", bg: "bg-success/10", badge: "8 ativos" },
  { id: "pages", label: "Páginas", description: "Editor visual de páginas e landing pages", icon: <Layout className="h-5 w-5" />, color: "text-info", bg: "bg-info/10", badge: "6 páginas" },
  { id: "home", label: "Editar Home", description: "Customizar a página inicial do site", icon: <Globe className="h-5 w-5" />, color: "text-warning", bg: "bg-warning/10", badge: null },
  { id: "blog", label: "Blog", description: "Criar artigos, categorias e tags", icon: <FileText className="h-5 w-5" />, color: "text-violet-500", bg: "bg-violet-500/10", badge: "2 artigos" },
  { id: "media", label: "Biblioteca de Mídia", description: "Upload e organização de arquivos", icon: <Image className="h-5 w-5" />, color: "text-pink-500", bg: "bg-pink-500/10", badge: "24 arquivos" },
  { id: "emails", label: "Templates de Email", description: "Personalizar emails transacionais", icon: <Mail className="h-5 w-5" />, color: "text-orange-500", bg: "bg-orange-500/10", badge: "12 templates" },
  { id: "categories", label: "Categorias & Tags", description: "Organizar o catálogo de cursos", icon: <Tag className="h-5 w-5" />, color: "text-teal-500", bg: "bg-teal-500/10", badge: null },
  { id: "menus", label: "Menus", description: "Configurar cabeçalho, rodapé e menus laterais", icon: <Menu className="h-5 w-5" />, color: "text-indigo-500", bg: "bg-indigo-500/10", badge: null },
  { id: "theme", label: "Tema da Plataforma", description: "Cores, fontes, logo e identidade visual", icon: <Palette className="h-5 w-5" />, color: "text-purple-500", bg: "bg-purple-500/10", badge: null },
  { id: "certificates", label: "Certificados", description: "Templates e configurações de certificados", icon: <Award className="h-5 w-5" />, color: "text-yellow-500", bg: "bg-yellow-500/10", badge: "3 templates" },
  { id: "analytics", label: "SEO & Analytics", description: "Meta tags, pixels e rastreamento", icon: <BarChart2 className="h-5 w-5" />, color: "text-cyan-500", bg: "bg-cyan-500/10", badge: null },
  { id: "integrations", label: "Integrações", description: "Webhooks, n8n, Zapier, Make e mais", icon: <Puzzle className="h-5 w-5" />, color: "text-foreground-muted", bg: "bg-muted", badge: "2 ativas" },
  { id: "domain", label: "Domínio", description: "Configurar domínio personalizado", icon: <Globe className="h-5 w-5" />, color: "text-emerald-500", bg: "bg-emerald-500/10", badge: null },
  { id: "settings", label: "Configurações gerais", description: "Idioma, moeda, fuso horário e mais", icon: <Settings className="h-5 w-5" />, color: "text-foreground-muted", bg: "bg-muted", badge: null },
];

export default function ContentStudioPage() {
  const { success } = useToast();
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<string | null>(null);

  const filtered = modules.filter((m) =>
    !search || m.label.toLowerCase().includes(search.toLowerCase()) || m.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-foreground">Content Studio</h1>
            <Badge variant="default">Beta</Badge>
          </div>
          <p className="text-sm text-foreground-muted mt-0.5">
            Gerencie toda a plataforma sem depender de desenvolvedores.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="max-w-sm">
        <Input placeholder="Buscar módulo..." leftIcon={<Search className="h-4 w-4" />} value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Module grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {filtered.map((mod) => (
          <button
            key={mod.id}
            onClick={() => { setActive(mod.id); success(`Abrindo ${mod.label}...`); }}
            className={cn(
              "group text-left rounded-xl border p-4 transition-all duration-200",
              "hover:border-primary/40 hover:shadow-md hover:scale-[1.01]",
              active === mod.id ? "border-primary bg-primary/5" : "border-border bg-card"
            )}
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-110", mod.bg, mod.color)}>
                {mod.icon}
              </div>
              {mod.badge && <Badge variant="secondary" className="text-2xs">{mod.badge}</Badge>}
            </div>
            <h3 className="text-sm font-semibold text-foreground">{mod.label}</h3>
            <p className="text-xs text-foreground-muted mt-0.5 leading-relaxed">{mod.description}</p>
            <div className="mt-3 flex items-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity font-medium">
              Abrir <ChevronRight className="h-3 w-3" />
            </div>
          </button>
        ))}
      </div>

      {/* Quick actions */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4">Ações rápidas</h2>
        <div className="flex flex-wrap gap-2">
          {[
            "Criar novo curso", "Publicar produto", "Agendar conteúdo",
            "Editar homepage", "Gerar sitemap", "Verificar SEO",
            "Novo artigo no blog", "Subir vídeo", "Criar cupom",
          ].map((action) => (
            <Button key={action} variant="outline" size="sm" onClick={() => success(`${action}...`)}>
              <Plus className="h-3.5 w-3.5 mr-1" />{action}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
