"use client";
import { useState } from "react";
import Link from "next/link";
import { Search, Star, Users, BookOpen, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MOCK_PRODUCTS, MOCK_CATEGORIES } from "@/lib/mock/data";

const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function StudentExplorePage() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filtered = MOCK_PRODUCTS.filter((p) => {
    const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.description?.toLowerCase().includes(search.toLowerCase());
    const matchCat = !selectedCategory || p.categoryId === selectedCategory;
    return matchSearch && matchCat && p.status === "published";
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Explorar Cursos</h1>
        <p className="text-sm text-foreground-muted mt-0.5">Descubra novos conhecimentos e expanda suas habilidades</p>
      </div>

      {/* Search + filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Buscar cursos, temas, instrutores..."
          leftIcon={<Search className="h-4 w-4" />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
        <Button variant="outline" leftIcon={<SlidersHorizontal className="h-4 w-4" />}>Filtros</Button>
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            !selectedCategory
              ? "bg-primary text-white border-primary"
              : "border-border text-foreground-muted hover:border-primary/40 hover:text-foreground"
          }`}
        >
          Todos
        </button>
        {MOCK_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              selectedCategory === cat.id
                ? "bg-primary text-white border-primary"
                : "border-border text-foreground-muted hover:border-primary/40 hover:text-foreground"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Results count */}
      <p className="text-xs text-foreground-muted">{filtered.length} curso{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""}</p>

      {/* Course grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((product) => (
            <div key={product.id} className="group rounded-lg border border-border bg-card overflow-hidden hover:border-primary/30 hover:shadow-md transition-all duration-200 flex flex-col">
              <div className="relative aspect-video overflow-hidden bg-muted">
                <img
                  src={product.thumbnail}
                  alt={product.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {product.isFeatured && (
                  <Badge variant="warning" className="absolute top-2 left-2 text-2xs">Destaque</Badge>
                )}
              </div>

              <div className="p-4 flex flex-col flex-1 space-y-2">
                {product.category && (
                  <span className="text-2xs font-medium text-primary">{product.category.name}</span>
                )}
                <h3 className="text-sm font-semibold text-foreground line-clamp-2 leading-snug flex-1">{product.title}</h3>
                {product.description && (
                  <p className="text-xs text-foreground-muted line-clamp-2">{product.description}</p>
                )}

                <div className="flex items-center gap-3 text-xs text-foreground-muted pt-1">
                  {product.rating && (
                    <span className="flex items-center gap-1 text-warning-foreground font-medium">
                      <Star className="h-3 w-3 fill-current text-yellow-400" />
                      {product.rating.toFixed(1)}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {product.enrolledCount.toLocaleString("pt-BR")}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="text-sm font-bold text-foreground">
                    {product.price === 0 ? "Grátis" : fmt(product.price)}
                  </span>
                  <Link href="/course"><Button size="xs">Ver curso</Button></Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BookOpen className="h-10 w-10 text-foreground-subtle mb-3" />
          <p className="text-sm font-medium text-foreground">Nenhum curso encontrado</p>
          <p className="text-xs text-foreground-muted mt-1">Tente outros termos ou remova os filtros</p>
          <Button variant="ghost" size="sm" className="mt-3" onClick={() => { setSearch(""); setSelectedCategory(null); }}>
            Limpar filtros
          </Button>
        </div>
      )}
    </div>
  );
}
