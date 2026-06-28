"use client";
import { useState } from "react";
import { Plus, Eye, Edit, Globe, FileText, Image, Layout, Settings, ChevronRight, Calendar, Archive, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dropdown } from "@/components/ui/dropdown";
import { useToast } from "@/components/ui/toast";
import { MOCK_ARTICLES } from "@/lib/mock/data";
import { formatRelativeDate } from "@/lib/utils/cn";

const MOCK_PAGES = [
  { id: "p1", type: "home", title: "Página Inicial", slug: "/", status: "published", updatedAt: "2026-06-25T10:00:00Z" },
  { id: "p2", type: "landing", title: "Landing — Next.js 14", slug: "/lp/nextjs-14", status: "published", updatedAt: "2026-06-20T10:00:00Z" },
  { id: "p3", type: "about", title: "Sobre Nós", slug: "/sobre", status: "published", updatedAt: "2026-06-15T10:00:00Z" },
  { id: "p4", type: "faq", title: "FAQ", slug: "/faq", status: "draft", updatedAt: "2026-06-10T10:00:00Z" },
  { id: "p5", type: "legal", title: "Política de Privacidade", slug: "/privacidade", status: "published", updatedAt: "2026-05-01T10:00:00Z" },
  { id: "p6", type: "landing", title: "Black Friday 2026", slug: "/lp/black-friday", status: "scheduled", updatedAt: "2026-06-28T10:00:00Z" },
];

const pageTypeIcons: Record<string, React.ReactNode> = {
  home: <Globe className="h-4 w-4" />,
  landing: <Layout className="h-4 w-4" />,
  about: <FileText className="h-4 w-4" />,
  faq: <FileText className="h-4 w-4" />,
  legal: <FileText className="h-4 w-4" />,
};

const statusConfig: Record<string, { label: string; variant: "success" | "secondary" | "warning" | "destructive" }> = {
  published: { label: "Publicado", variant: "success" },
  draft:     { label: "Rascunho",  variant: "secondary" },
  scheduled: { label: "Agendado",  variant: "warning" },
  archived:  { label: "Arquivado", variant: "destructive" },
};

export default function AdminCMSPage() {
  const { success } = useToast();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">CMS</h1>
          <p className="text-sm text-foreground-muted mt-0.5">Gerencie páginas, artigos e conteúdo da plataforma</p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />}>Nova página</Button>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Editar Home", icon: <Globe className="h-5 w-5" />, color: "text-primary" },
          { label: "Landing Pages", icon: <Layout className="h-5 w-5" />, color: "text-success" },
          { label: "Blog", icon: <FileText className="h-5 w-5" />, color: "text-info" },
          { label: "Biblioteca de mídia", icon: <Image className="h-5 w-5" />, color: "text-warning" },
        ].map((item) => (
          <button key={item.label} className="rounded-lg border border-border bg-card p-4 flex flex-col items-center gap-2 hover:border-primary/30 hover:bg-muted/30 transition-all text-center group">
            <span className={`${item.color} group-hover:scale-110 transition-transform`}>{item.icon}</span>
            <span className="text-xs font-medium text-foreground">{item.label}</span>
          </button>
        ))}
      </div>

      <Tabs defaultValue="pages">
        <TabsList>
          <TabsTrigger value="pages">Páginas ({MOCK_PAGES.length})</TabsTrigger>
          <TabsTrigger value="blog">Blog ({MOCK_ARTICLES.length})</TabsTrigger>
          <TabsTrigger value="media">Mídia</TabsTrigger>
          <TabsTrigger value="menus">Menus</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
        </TabsList>

        <TabsContent value="pages" className="mt-4">
          <div className="rounded-lg border border-border bg-card overflow-hidden divide-y divide-border">
            {MOCK_PAGES.map((page) => {
              const cfg = statusConfig[page.status];
              return (
                <div key={page.id} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/20 transition-colors">
                  <span className="text-foreground-muted shrink-0">{pageTypeIcons[page.type] ?? <FileText className="h-4 w-4" />}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{page.title}</p>
                    <p className="text-xs text-foreground-muted font-mono">{page.slug}</p>
                  </div>
                  <Badge variant={cfg.variant}>{cfg.label}</Badge>
                  <p className="text-xs text-foreground-muted shrink-0 hidden sm:block">{formatRelativeDate(page.updatedAt)}</p>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon-sm" title="Visualizar"><Eye className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon-sm" title="Editar"><Edit className="h-3.5 w-3.5" /></Button>
                    <Dropdown
                      trigger={<Button variant="ghost" size="icon-sm"><MoreHorizontal className="h-3.5 w-3.5" /></Button>}
                      items={[
                        { label: "Duplicar", onClick: () => success("Página duplicada!") },
                        { label: "Agendar", icon: <Calendar className="h-3.5 w-3.5" />, onClick: () => {} },
                        { separator: true },
                        { label: "Arquivar", icon: <Archive className="h-3.5 w-3.5" />, onClick: () => {}, variant: "destructive" },
                      ]}
                      align="right"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="blog" className="mt-4">
          <div className="space-y-3">
            <div className="flex justify-end">
              <Button leftIcon={<Plus className="h-4 w-4" />} size="sm">Novo artigo</Button>
            </div>
            {MOCK_ARTICLES.map((article) => (
              <div key={article.id} className="rounded-lg border border-border bg-card p-4 hover:border-primary/30 transition-all group flex items-start gap-4">
                <img src={article.thumbnail} className="h-16 w-24 rounded object-cover shrink-0" alt={article.title} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-foreground line-clamp-2">{article.title}</h3>
                    <Badge variant="success">Publicado</Badge>
                  </div>
                  <p className="text-xs text-foreground-muted mt-1 line-clamp-2">{article.excerpt}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-foreground-muted">
                    <span>Por {article.author?.name}</span>
                    <span>·</span>
                    <span>{article.readTime} min leitura</span>
                    <span>·</span>
                    <span>{article.views} views</span>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <Button variant="ghost" size="icon-sm"><Eye className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon-sm"><Edit className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="seo" className="mt-4">
          <div className="space-y-4 max-w-2xl">
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <h2 className="text-sm font-semibold text-foreground">SEO Global</h2>
              <div className="grid gap-3">
                {["Meta Title padrão", "Meta Description padrão", "Open Graph Image"].map((field) => (
                  <div key={field} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <span className="text-sm text-foreground">{field}</span>
                    <Button variant="ghost" size="xs">Editar</Button>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <h2 className="text-sm font-semibold text-foreground">Arquivos técnicos</h2>
              {[
                { label: "sitemap.xml", status: "Gerado automaticamente" },
                { label: "robots.txt", status: "Configurado" },
                { label: "Schema.org (JSON-LD)", status: "Ativo" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium text-foreground font-mono">{item.label}</p>
                    <p className="text-xs text-foreground-muted">{item.status}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="xs">Visualizar</Button>
                    <Button variant="ghost" size="xs">Editar</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
