"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Heart, BookOpen, Check, Play } from "lucide-react";
import { toggleFavorite } from "@/lib/actions/favorites";
import { CdnImg } from "@/components/ui/cdn-img";
import { Bar, hours } from "@/components/student/kit";
import { cn, formatCurrency } from "@/lib/utils/cn";

export interface ExploreProduct {
  id: string;
  slug: string;
  title: string;
  description: string;
  thumbnail: string;
  price: number;
  comparePrice: number | null;
  rating: number;
  enrolledCount: number;
  isFeatured: boolean;
  categoryId: string | null;
  categoryName: string | null;
  isFavorite: boolean;
  courseId: string | null;
  modules: number;
  lessons: number;
  seconds: number;
  examIn: number | null;
  examDate: string | null;
  owned: boolean;
  progress: number;
}
export interface ExploreCategory {
  id: string;
  name: string;
}

type Sort = "prova" | "populares" | "preco";
const price = (n: number) => (n === 0 ? "Grátis" : formatCurrency(n));
const examLabel = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { day: "numeric", month: "short", timeZone: "UTC" });

// Cursos (modelo 7f): destaque no topo, filtros por categoria, ordenação e "você tem" marcado.
export function ExploreClient({ products, categories, loggedIn }: { products: ExploreProduct[]; categories: ExploreCategory[]; loggedIn: boolean }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>("prova");
  const [favs, setFavs] = useState<Record<string, boolean>>(Object.fromEntries(products.map((p) => [p.id, p.isFavorite])));

  // Destaque: curso marcado como destaque que o aluno ainda não tem (senão o de prova mais próxima).
  const hero = products.find((p) => p.isFeatured && !p.owned) ?? [...products].filter((p) => !p.owned && p.examIn !== null).sort((a, b) => a.examIn! - b.examIn!)[0] ?? null;

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = products.filter((p) =>
      (!q || p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)) && (!category || p.categoryId === category));
    return filtered.sort((a, b) =>
      Number(b.owned) - Number(a.owned) ||
      (sort === "preco" ? a.price - b.price
        : sort === "populares" ? b.enrolledCount - a.enrolledCount
        : (a.examIn ?? 99999) - (b.examIn ?? 99999)));
  }, [products, search, category, sort]);

  async function handleFav(productId: string) {
    if (!loggedIn) { router.push("/login"); return; }
    setFavs((prev) => ({ ...prev, [productId]: !prev[productId] }));
    await toggleFavorite(productId);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-[22px] font-extrabold text-foreground lg:text-[26px]">Cursos</h1>
        <Link href="/student/favorites" className="text-[13px] font-semibold text-brand">Meus favoritos →</Link>
      </div>

      {hero && (
        <div className="relative overflow-hidden rounded-[14px] bg-navy text-white">
          <CdnImg src={hero.thumbnail} width={1200} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />
          <div className="relative flex flex-col gap-3 p-5 lg:max-w-[62%] lg:p-7">
            <div className="flex flex-wrap gap-2 text-[11px] font-bold uppercase tracking-wider">
              <span className="rounded-full bg-brand px-2.5 py-1">{hero.isFeatured ? "Destaque" : "Prova se aproximando"}</span>
              {hero.examIn !== null && hero.examDate && <span className="rounded-full bg-white/10 px-2.5 py-1">Prova em {examLabel(hero.examDate)}</span>}
            </div>
            <h2 className="text-[22px] font-extrabold leading-tight lg:text-[28px]">{hero.title}</h2>
            <p className="text-sm text-white/70">
              {[hero.modules ? `${hero.modules} módulos` : null, hero.lessons ? `${hero.lessons} aulas` : null, hero.seconds ? hours(hero.seconds) : null].filter(Boolean).join(" · ")}
              {hero.description ? ` — ${hero.description}` : ""}
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link href={`/checkout?productId=${hero.id}`} className="inline-flex h-10 items-center rounded-lg bg-brand px-4 text-sm font-bold hover:bg-brand-dark">Comprar · {price(hero.price)}</Link>
              <Link href={`/cursos/${hero.slug}`} className="inline-flex h-10 items-center gap-2 rounded-lg bg-white/10 px-4 text-sm font-bold hover:bg-white/20"><Play className="h-4 w-4 fill-current" /> Ver aula grátis</Link>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="-mx-4 flex flex-1 gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-wrap lg:px-0">
          <button type="button" onClick={() => setCategory(null)} className={chip(!category)}>Todos · {products.length}</button>
          {categories.map((c) => (
            <button key={c.id} type="button" onClick={() => setCategory(c.id === category ? null : c.id)} className={chip(category === c.id)}>{c.name}</button>
          ))}
        </div>
        <div className="flex gap-2">
          <label className="flex h-9 flex-1 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm text-foreground-muted focus-within:border-brand lg:w-56">
            <Search className="h-4 w-4 shrink-0" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar concurso ou cargo..." className="w-full bg-transparent text-foreground outline-none placeholder:text-foreground-muted" />
          </label>
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Ordenar"
            className="h-9 rounded-lg border border-border bg-card px-2 text-[13px] font-semibold text-foreground">
            <option value="prova">Prova mais próxima</option>
            <option value="populares">Mais populares</option>
            <option value="preco">Menor preço</option>
          </select>
        </div>
      </div>

      {list.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:gap-4 xl:grid-cols-4">
          {list.map((p) => {
            const off = p.comparePrice && p.comparePrice > p.price ? Math.round((1 - p.price / p.comparePrice) * 100) : 0;
            return (
              <div key={p.id} className={cn("flex flex-col overflow-hidden rounded-[14px] border bg-card", p.owned ? "border-ok/50" : "border-border")}>
                <div className="relative">
                <Link href={p.owned && p.courseId ? `/student/course?courseId=${p.courseId}` : `/cursos/${p.slug}`} className="relative block aspect-[16/10] bg-navy">
                  <CdnImg src={p.thumbnail} width={400} aspect="16:10" alt="" className="h-full w-full object-cover" />
                  <span className="absolute left-2 top-2 flex flex-wrap gap-1.5">
                    {p.owned && <span className="inline-flex items-center gap-1 rounded-full bg-ok px-2 py-0.5 text-[10.5px] font-bold text-white"><Check className="h-3 w-3" /> Você tem</span>}
                    {!p.owned && off > 0 && <span className="rounded-full bg-brand px-2 py-0.5 text-[10.5px] font-bold text-white">−{off}%</span>}
                    {!p.owned && p.examIn !== null && <span className="rounded-full bg-navy/80 px-2 py-0.5 text-[10.5px] font-bold text-white">Prova em {p.examIn} dias</span>}
                  </span>
                </Link>
                <button type="button" onClick={() => handleFav(p.id)} aria-label={favs[p.id] ? "Remover dos favoritos" : "Favoritar"}
                  className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/50 text-white hover:bg-black/70">
                  <Heart className={cn("h-4 w-4", favs[p.id] && "fill-white")} />
                </button>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  {p.categoryName && <span className="text-[11px] font-bold uppercase tracking-wider text-brand">{p.categoryName}</span>}
                  <h3 className="mt-0.5 line-clamp-2 text-[15px] font-bold leading-snug text-foreground">{p.title}</h3>
                  <p className="mt-1 text-xs text-foreground-muted">
                    {[p.modules ? `${p.modules} módulos` : null, p.seconds ? hours(p.seconds) : null, p.examDate ? `prova ${examLabel(p.examDate)}` : null].filter(Boolean).join(" · ") || " "}
                  </p>
                  <div className="mt-auto pt-3">
                    {p.owned && p.courseId ? (
                      <>
                        <Bar value={p.progress} tone={p.progress === 100 ? "ok" : "brand"} />
                        <Link href={`/student/course?courseId=${p.courseId}`} className="mt-3 inline-flex h-9 w-full items-center justify-center rounded-lg bg-navy text-[13px] font-bold text-white dark:bg-white dark:text-navy">Continuar · {p.progress}%</Link>
                      </>
                    ) : (
                      <div className="flex items-center justify-between gap-2 border-t border-line-soft pt-3 dark:border-white/10">
                        <span>
                          <span className="block text-[15px] font-extrabold text-foreground">{price(p.price)}</span>
                          {off > 0 && <span className="block text-xs text-foreground-muted line-through">{formatCurrency(p.comparePrice!)}</span>}
                        </span>
                        <Link href={`/checkout?productId=${p.id}`} className="inline-flex h-9 items-center rounded-lg bg-brand px-4 text-[13px] font-bold text-white hover:bg-brand-dark">Comprar</Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BookOpen className="mb-3 h-10 w-10 text-foreground-muted" />
          <p className="text-sm font-semibold text-foreground">Nenhum curso encontrado</p>
          <p className="mt-1 text-xs text-foreground-muted">Tente outros termos ou remova os filtros.</p>
        </div>
      )}
    </div>
  );
}

function chip(active: boolean) {
  return cn("inline-flex h-8 shrink-0 items-center rounded-full border px-3.5 text-[13px] font-semibold transition-colors",
    active ? "border-navy bg-navy text-white dark:border-white dark:bg-white dark:text-navy" : "border-border bg-card text-foreground-muted hover:text-foreground");
}
