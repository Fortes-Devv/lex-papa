"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Star, Users, BookOpen, Heart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toggleFavorite } from "@/lib/actions/favorites";
import { cn } from "@/lib/utils/cn";

export interface ExploreProduct {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  price: number;
  rating: number;
  enrolledCount: number;
  isFeatured: boolean;
  categoryId: string | null;
  categoryName: string | null;
  isFavorite: boolean;
}
export interface ExploreCategory {
  id: string;
  name: string;
}

const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function ExploreClient({ products, categories, loggedIn }: { products: ExploreProduct[]; categories: ExploreCategory[]; loggedIn: boolean }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [favs, setFavs] = useState<Record<string, boolean>>(Object.fromEntries(products.map((p) => [p.id, p.isFavorite])));

  const filtered = products.filter((p) => {
    const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase());
    const matchCat = !selectedCategory || p.categoryId === selectedCategory;
    return matchSearch && matchCat;
  });

  async function handleFav(productId: string) {
    if (!loggedIn) { router.push("/login"); return; }
    setFavs((prev) => ({ ...prev, [productId]: !prev[productId] }));
    await toggleFavorite(productId);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Explorar Cursos</h1>
        <p className="text-sm text-foreground-muted mt-0.5">Descubra novos conhecimentos e expanda suas habilidades</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Input placeholder="Buscar cursos, temas..." leftIcon={<Search className="h-4 w-4" />} value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1" />
      </div>

      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setSelectedCategory(null)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${!selectedCategory ? "bg-primary text-white border-primary" : "border-border text-foreground-muted hover:border-primary/40 hover:text-foreground"}`}>Todos</button>
          {categories.map((cat) => (
            <button key={cat.id} onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${selectedCategory === cat.id ? "bg-primary text-white border-primary" : "border-border text-foreground-muted hover:border-primary/40 hover:text-foreground"}`}>{cat.name}</button>
          ))}
        </div>
      )}

      <p className="text-xs text-foreground-muted">{filtered.length} curso{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""}</p>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((product) => (
            <div key={product.id} className="group rounded-lg border border-border bg-card overflow-hidden hover:border-primary/30 hover:shadow-md transition-all duration-200 flex flex-col">
              <div className="relative aspect-video overflow-hidden bg-muted">
                <img src={product.thumbnail} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                {product.isFeatured && <Badge variant="warning" className="absolute top-2 left-2 text-2xs">Destaque</Badge>}
                <button
                  onClick={() => handleFav(product.id)}
                  className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70 transition-colors"
                  title={favs[product.id] ? "Remover dos favoritos" : "Favoritar"}
                >
                  <Heart className={cn("h-3.5 w-3.5 text-white", favs[product.id] && "fill-white")} />
                </button>
              </div>
              <div className="p-4 flex flex-col flex-1 space-y-2">
                {product.categoryName && <span className="text-2xs font-medium text-primary">{product.categoryName}</span>}
                <h3 className="text-sm font-semibold text-foreground line-clamp-2 leading-snug flex-1">{product.title}</h3>
                <div className="flex items-center gap-3 text-xs text-foreground-muted pt-1">
                  {product.rating > 0 && <span className="flex items-center gap-1 font-medium"><Star className="h-3 w-3 fill-current text-yellow-400" />{product.rating.toFixed(1)}</span>}
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" />{product.enrolledCount.toLocaleString("pt-BR")}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="text-sm font-bold text-foreground">{product.price === 0 ? "Grátis" : fmt(product.price)}</span>
                  <Link href={`/course?productId=${product.id}`}><Button size="xs">Ver curso</Button></Link>
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
        </div>
      )}
    </div>
  );
}
