"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit, Trash2, ExternalLink, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { formatRelativeDate } from "@/lib/utils/cn";
import { savePage, deletePage, saveArticle, deleteArticle } from "@/lib/actions/cms";

export interface CmsPage { id: string; title: string; slug: string; content: string; status: string; updatedAt: string }
export interface CmsArticle { id: string; title: string; slug: string; excerpt: string; content: string; status: string; views: number; updatedAt: string }

const statusConfig: Record<string, { label: string; variant: "success" | "secondary" | "warning" | "destructive" }> = {
  published: { label: "Publicado", variant: "success" },
  draft: { label: "Rascunho", variant: "secondary" },
  scheduled: { label: "Agendado", variant: "warning" },
  archived: { label: "Arquivado", variant: "destructive" },
};

export function CmsClient({ pages, articles }: { pages: CmsPage[]; articles: CmsArticle[] }) {
  const { success, error } = useToast();
  const router = useRouter();

  const [pageDialog, setPageDialog] = useState(false);
  const [pageForm, setPageForm] = useState<{ id?: string; title: string; content: string; status: "draft" | "published" }>({ title: "", content: "", status: "draft" });
  const [articleDialog, setArticleDialog] = useState(false);
  const [articleForm, setArticleForm] = useState<{ id?: string; title: string; excerpt: string; content: string; status: "draft" | "published" }>({ title: "", excerpt: "", content: "", status: "draft" });

  function newPage() { setPageForm({ title: "", content: "", status: "draft" }); setPageDialog(true); }
  function editPage(p: CmsPage) { setPageForm({ id: p.id, title: p.title, content: p.content, status: p.status === "published" ? "published" : "draft" }); setPageDialog(true); }
  async function submitPage() {
    const r = await savePage(pageForm);
    if (!r.success) { error(r.error); return; }
    success("Página salva!"); setPageDialog(false); router.refresh();
  }
  async function removePage(id: string) { if (!confirm("Excluir esta página?")) return; await deletePage(id); success("Página excluída."); router.refresh(); }

  function newArticle() { setArticleForm({ title: "", excerpt: "", content: "", status: "draft" }); setArticleDialog(true); }
  function editArticle(a: CmsArticle) { setArticleForm({ id: a.id, title: a.title, excerpt: a.excerpt, content: a.content, status: a.status === "published" ? "published" : "draft" }); setArticleDialog(true); }
  async function submitArticle() {
    const r = await saveArticle(articleForm);
    if (!r.success) { error(r.error); return; }
    success("Artigo salvo!"); setArticleDialog(false); router.refresh();
  }
  async function removeArticle(id: string) { if (!confirm("Excluir este artigo?")) return; await deleteArticle(id); success("Artigo excluído."); router.refresh(); }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">CMS</h1>
        <p className="text-sm text-foreground-muted mt-0.5">Páginas estáticas e artigos do blog</p>
      </div>

      <Tabs defaultValue="pages">
        <TabsList>
          <TabsTrigger value="pages">Páginas ({pages.length})</TabsTrigger>
          <TabsTrigger value="blog">Blog ({articles.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pages" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={newPage}>Nova página</Button>
          </div>
          {pages.length === 0 && <div className="py-12 text-center text-sm text-foreground-muted border border-dashed border-border rounded-lg">Nenhuma página criada.</div>}
          {pages.map((page) => (
            <div key={page.id} className="rounded-lg border border-border bg-card p-4 flex items-center gap-3">
              <FileText className="h-4 w-4 text-foreground-muted shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{page.title}</p>
                <p className="text-xs text-foreground-muted font-mono">/p/{page.slug}</p>
              </div>
              <Badge variant={statusConfig[page.status]?.variant ?? "secondary"}>{statusConfig[page.status]?.label ?? page.status}</Badge>
              <span className="text-xs text-foreground-muted hidden sm:block">{formatRelativeDate(page.updatedAt)}</span>
              {page.status === "published" && <a href={`/p/${page.slug}`} target="_blank" className="text-foreground-muted hover:text-foreground"><ExternalLink className="h-4 w-4" /></a>}
              <Button variant="ghost" size="icon-sm" onClick={() => editPage(page)}><Edit className="h-3.5 w-3.5" /></Button>
              <Button variant="ghost" size="icon-sm" onClick={() => removePage(page.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="blog" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={newArticle}>Novo artigo</Button>
          </div>
          {articles.length === 0 && <div className="py-12 text-center text-sm text-foreground-muted border border-dashed border-border rounded-lg">Nenhum artigo criado.</div>}
          {articles.map((article) => (
            <div key={article.id} className="rounded-lg border border-border bg-card p-4 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{article.title}</p>
                <p className="text-xs text-foreground-muted truncate">{article.excerpt}</p>
              </div>
              <Badge variant={statusConfig[article.status]?.variant ?? "secondary"}>{statusConfig[article.status]?.label ?? article.status}</Badge>
              <span className="text-xs text-foreground-muted hidden sm:block">{article.views} views</span>
              {article.status === "published" && <a href={`/blog/${article.slug}`} target="_blank" className="text-foreground-muted hover:text-foreground"><ExternalLink className="h-4 w-4" /></a>}
              <Button variant="ghost" size="icon-sm" onClick={() => editArticle(article)}><Edit className="h-3.5 w-3.5" /></Button>
              <Button variant="ghost" size="icon-sm" onClick={() => removeArticle(article.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
            </div>
          ))}
        </TabsContent>
      </Tabs>

      <Dialog open={pageDialog} onClose={() => setPageDialog(false)} title={pageForm.id ? "Editar página" : "Nova página"} size="lg">
        <div className="space-y-4">
          <Input label="Título" value={pageForm.title} onChange={(e) => setPageForm((f) => ({ ...f, title: e.target.value }))} />
          <Textarea label="Conteúdo (HTML ou texto)" value={pageForm.content} onChange={(e) => setPageForm((f) => ({ ...f, content: e.target.value }))} className="min-h-[200px]" />
          <Select label="Status" options={[{ value: "draft", label: "Rascunho" }, { value: "published", label: "Publicado" }]} value={pageForm.status} onChange={(e) => setPageForm((f) => ({ ...f, status: e.target.value as "draft" | "published" }))} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setPageDialog(false)}>Cancelar</Button>
          <Button onClick={submitPage}>Salvar</Button>
        </DialogFooter>
      </Dialog>

      <Dialog open={articleDialog} onClose={() => setArticleDialog(false)} title={articleForm.id ? "Editar artigo" : "Novo artigo"} size="lg">
        <div className="space-y-4">
          <Input label="Título" value={articleForm.title} onChange={(e) => setArticleForm((f) => ({ ...f, title: e.target.value }))} />
          <Input label="Resumo" value={articleForm.excerpt} onChange={(e) => setArticleForm((f) => ({ ...f, excerpt: e.target.value }))} />
          <Textarea label="Conteúdo" value={articleForm.content} onChange={(e) => setArticleForm((f) => ({ ...f, content: e.target.value }))} className="min-h-[200px]" />
          <Select label="Status" options={[{ value: "draft", label: "Rascunho" }, { value: "published", label: "Publicado" }]} value={articleForm.status} onChange={(e) => setArticleForm((f) => ({ ...f, status: e.target.value as "draft" | "published" }))} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setArticleDialog(false)}>Cancelar</Button>
          <Button onClick={submitArticle}>Salvar</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
