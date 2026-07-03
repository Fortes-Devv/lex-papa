"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, MoreHorizontal, Eye, Edit, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Dropdown } from "@/components/ui/dropdown";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CreateCourseDialog } from "@/components/course/create-course-dialog";
import { formatCurrency } from "@/lib/utils/cn";
import type { ProductType, ProductStatus } from "@/lib/types";

export interface ProductDTO {
  id: string;
  title: string;
  type: ProductType;
  status: ProductStatus;
  thumbnail: string;
  price: number;
  comparePrice?: number;
  rating: number;
  reviewCount: number;
  enrolledCount: number;
  isFeatured: boolean;
  categoryName?: string;
}

const typeLabels: Record<ProductType, string> = {
  course: "Curso", bundle: "Pacote", subscription: "Assinatura", free: "Gratuito",
  hidden: "Oculto", presale: "Pré-venda", digital_download: "Download Digital",
  workshop: "Workshop", online_event: "Evento Online", mentoring: "Mentoria",
};

const statusVariants: Record<ProductStatus, "success" | "secondary" | "warning" | "destructive"> = {
  published: "success", draft: "secondary", archived: "destructive", scheduled: "warning", hidden: "secondary"
};
const statusLabels: Record<ProductStatus, string> = {
  published: "Publicado", draft: "Rascunho", archived: "Arquivado", scheduled: "Agendado", hidden: "Oculto"
};

function ProductCard({ product }: { product: ProductDTO }) {
  const router = useRouter();
  return (
    <div className="group rounded-lg border border-border bg-card overflow-hidden hover:border-primary/30 hover:shadow-md transition-all duration-200">
      <div className="relative aspect-video overflow-hidden bg-muted">
        <img src={product.thumbnail} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        <div className="absolute top-2 right-2 flex gap-1">
          <Badge variant={statusVariants[product.status]}>{statusLabels[product.status]}</Badge>
        </div>
        {product.isFeatured && (
          <div className="absolute top-2 left-2">
            <Badge variant="warning"><Star className="h-2.5 w-2.5" /> Destaque</Badge>
          </div>
        )}
      </div>
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-foreground line-clamp-2 leading-snug">{product.title}</p>
            <p className="text-xs text-foreground-muted mt-0.5">{typeLabels[product.type]}</p>
          </div>
          <Dropdown
            trigger={<Button variant="ghost" size="icon-sm"><MoreHorizontal className="h-4 w-4" /></Button>}
            items={[
              { label: "Visualizar", icon: <Eye className="h-3.5 w-3.5" />, onClick: () => router.push(`/course?productId=${product.id}`) },
              { label: "Editar conteúdo", icon: <Edit className="h-3.5 w-3.5" />, onClick: () => router.push("/admin/courses") },
            ]}
            align="right"
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-base font-bold text-foreground">{product.price === 0 ? "Grátis" : formatCurrency(product.price)}</span>
            {product.comparePrice && <span className="ml-1.5 text-xs text-foreground-muted line-through">{formatCurrency(product.comparePrice)}</span>}
          </div>
          <div className="flex items-center gap-1 text-xs text-foreground-muted">
            <Star className="h-3 w-3 fill-warning text-warning" />
            {product.rating > 0 ? product.rating.toFixed(1) : "—"}
            <span>({product.reviewCount})</span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-foreground-muted pt-1 border-t border-border">
          <span>{product.enrolledCount} matriculados</span>
          {product.categoryName && (<><span>·</span><span>{product.categoryName}</span></>)}
        </div>
      </div>
    </div>
  );
}

export function ProductsClient({ products }: { products: ProductDTO[] }) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase());
      const matchType = !typeFilter || p.type === typeFilter;
      return matchSearch && matchType;
    });
  }, [products, search, typeFilter]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Produtos</h1>
          <p className="text-sm text-foreground-muted mt-0.5">{products.length} produtos cadastrados</p>
        </div>
        <CreateCourseDialog />
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px] max-w-xs">
          <Input placeholder="Buscar produto..." leftIcon={<Search className="h-4 w-4" />} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select
          options={Object.entries(typeLabels).map(([v, l]) => ({ value: v, label: l }))}
          placeholder="Tipo"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="w-44"
        />
      </div>

      <Tabs defaultValue="grid">
        <TabsList>
          <TabsTrigger value="grid">Grade</TabsTrigger>
          <TabsTrigger value="list">Lista</TabsTrigger>
        </TabsList>

        <TabsContent value="grid" className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
          {filtered.length === 0 && (
            <div className="py-16 text-center text-sm text-foreground-muted border border-dashed border-border rounded-lg">
              Nenhum produto encontrado.
            </div>
          )}
        </TabsContent>

        <TabsContent value="list" className="mt-4">
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            {filtered.map((p) => (
              <div key={p.id} className="flex items-center gap-4 px-4 py-3 border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                <img src={p.thumbnail} className="h-10 w-16 rounded object-cover shrink-0" alt={p.title} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{p.title}</p>
                  <p className="text-xs text-foreground-muted">{typeLabels[p.type]} · {p.enrolledCount} alunos</p>
                </div>
                <Badge variant={statusVariants[p.status]}>{statusLabels[p.status]}</Badge>
                <span className="text-sm font-semibold text-foreground shrink-0">{p.price === 0 ? "Grátis" : formatCurrency(p.price)}</span>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="py-16 text-center text-sm text-foreground-muted">Nenhum produto encontrado.</div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
