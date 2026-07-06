"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, Search, Star, Users, Trash2, BookOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { toggleFavorite } from "@/lib/actions/favorites";

export interface FavoriteProduct {
  id: string;
  title: string;
  thumbnail: string;
  price: number;
  rating: number;
  enrolledCount: number;
  categoryName: string | null;
}

const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function FavoritesClient({ favorites: initial }: { favorites: FavoriteProduct[] }) {
  const { success } = useToast();
  const router = useRouter();
  const [favorites, setFavorites] = useState(initial);
  const [search, setSearch] = useState("");

  const filtered = favorites.filter((p) => !search || p.title.toLowerCase().includes(search.toLowerCase()));

  async function removeFavorite(id: string) {
    setFavorites((prev) => prev.filter((f) => f.id !== id));
    success("Removido dos favoritos");
    await toggleFavorite(id);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Favoritos</h1>
          <p className="text-sm text-foreground-muted mt-0.5">{favorites.length} curso{favorites.length !== 1 ? "s" : ""} salvos</p>
        </div>
      </div>

      {favorites.length > 0 && (
        <div className="max-w-sm">
          <Input placeholder="Buscar nos favoritos..." leftIcon={<Search className="h-4 w-4" />} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      )}

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((product) => (
            <div key={product.id} className="group rounded-lg border border-border bg-card overflow-hidden hover:border-primary/30 hover:shadow-md transition-all duration-200 flex flex-col">
              <div className="relative aspect-video overflow-hidden bg-muted">
                <img src={product.thumbnail} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                <button onClick={() => removeFavorite(product.id)} className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/50 flex items-center justify-center opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity hover:bg-destructive" title="Remover dos favoritos">
                  <Heart className="h-3.5 w-3.5 text-white fill-white" />
                </button>
              </div>
              <div className="p-4 flex flex-col flex-1 space-y-2">
                {product.categoryName && <span className="text-2xs font-medium text-primary">{product.categoryName}</span>}
                <h3 className="text-sm font-semibold text-foreground line-clamp-2 leading-snug flex-1">{product.title}</h3>
                <div className="flex items-center gap-3 text-xs text-foreground-muted pt-1">
                  {product.rating > 0 && <span className="flex items-center gap-1 font-medium"><Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />{product.rating.toFixed(1)}</span>}
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" />{product.enrolledCount.toLocaleString("pt-BR")}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="text-sm font-bold text-foreground">{product.price === 0 ? "Grátis" : fmt(product.price)}</span>
                  <div className="flex gap-1.5">
                    <Button size="xs" variant="ghost" onClick={() => removeFavorite(product.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                    <Link href={`/course?productId=${product.id}`}><Button size="xs">Ver curso</Button></Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : favorites.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Heart className="h-10 w-10 text-foreground-subtle mb-3" />
          <p className="text-sm font-medium text-foreground">Nenhum favorito ainda</p>
          <p className="text-xs text-foreground-muted mt-1">Explore os cursos e salve os que mais te interessam</p>
          <Link href="/student/explore">
            <Button variant="outline" size="sm" className="mt-4" leftIcon={<BookOpen className="h-4 w-4" />}>Explorar cursos</Button>
          </Link>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Search className="h-8 w-8 text-foreground-subtle mb-3" />
          <p className="text-sm font-medium text-foreground">Nenhum resultado para &quot;{search}&quot;</p>
          <Button variant="ghost" size="sm" className="mt-3" onClick={() => setSearch("")}>Limpar busca</Button>
        </div>
      )}
    </div>
  );
}
