export const dynamic = "force-dynamic";
import Link from "next/link";
import { Plus } from "lucide-react";
import { db } from "@/lib/db";
import { CdnImg } from "@/components/ui/cdn-img";
import { PageHeader, Pill } from "@/components/admin/page-kit";
import { CreateCourseDialog } from "@/components/course/create-course-dialog";
import { formatCurrency, cn } from "@/lib/utils/cn";

const TYPE_LABEL: Record<string, string> = {
  course: "Curso completo", bundle: "Pacote", subscription: "Assinatura", free: "Gratuito", hidden: "Oculto", presale: "Pré-venda",
};

const initials = (title: string) => title.split(/\s+/).filter((w) => w.length > 2).map((w) => w[0]).slice(0, 3).join("").toUpperCase() || "LEX";
const hasRealCover = (url: string) => !!url && url.includes("res.cloudinary.com");

// Produtos (modelo 5d): cards com capa, preço e vendas. Filtros do painel: ?status=ativo|inativo, ?tipo=, ?q=.
export default async function AdminProductsPage(props: { searchParams: Promise<{ status?: string; tipo?: string; q?: string }> }) {
  const { status, tipo, q } = await props.searchParams;

  const products = await db.product.findMany({
    where: {
      ...(status === "ativo" ? { status: "published" as const } : status === "inativo" ? { status: { not: "published" as const } } : {}),
      ...(tipo ? { type: tipo as never } : {}),
      ...(q?.trim() ? { title: { contains: q.trim(), mode: "insensitive" as const } } : {}),
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    select: {
      id: true, title: true, type: true, status: true, thumbnail: true, price: true,
      course: { select: { id: true, _count: { select: { modules: true } } } },
      _count: { select: { orderItems: { where: { order: { status: "paid" } } } } },
    },
  });

  const weekAgo = new Date(Date.now() - 7 * 86_400_000);
  const weekSales = Number((await db.order.aggregate({ _sum: { total: true }, where: { status: "paid", paidAt: { gte: weekAgo } } }))._sum.total ?? 0);

  return (
    <div>
      <PageHeader
        title="Produtos"
        subtitle={`${products.length} produto${products.length !== 1 ? "s" : ""}${status || tipo || q ? " com este filtro" : ""} · ${formatCurrency(weekSales)} vendidos nos últimos 7 dias`}
        actions={<CreateCourseDialog openAfter="admin" />}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:gap-4 xl:grid-cols-3">
        {products.map((p) => {
          const active = p.status === "published";
          const href = p.course ? `/admin/courses/${p.course.id}` : "#";
          const sales = p._count.orderItems;
          return (
            <Link key={p.id} href={href}
              className={cn("group overflow-hidden rounded-[14px] border border-border bg-card transition-shadow hover:shadow-[0_6px_20px_rgba(31,43,58,.10)] sm:block", "flex sm:flex-col")}>
              <div className={cn("relative aspect-[16/10] w-[40%] shrink-0 overflow-hidden sm:w-full", active ? "bg-navy" : "bg-[#8a8f98]")}>
                {hasRealCover(p.thumbnail) ? (
                  <CdnImg src={p.thumbnail} width={360} aspect="16:10" alt="" className={cn("absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]", !active && "grayscale")} />
                ) : (
                  <span className={cn("absolute bottom-3 left-4 text-[28px] font-extrabold leading-none sm:text-[34px]", active ? "text-brand" : "text-white/60")}>{initials(p.title)}</span>
                )}
                <Pill tone={active ? "ok" : "gray"} className="absolute right-2.5 top-2.5 hidden sm:inline-flex">{active ? "Ativo" : "Inativo"}</Pill>
              </div>
              <div className="min-w-0 flex-1 p-3.5 sm:p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className={cn("line-clamp-2 text-[14px] font-bold leading-snug", active ? "text-foreground" : "text-foreground-muted")}>{p.title}</p>
                  <Pill tone={active ? "ok" : "gray"} className="shrink-0 sm:hidden">{active ? "Ativo" : "Inativo"}</Pill>
                </div>
                <p className="mt-0.5 truncate text-xs text-foreground-muted">
                  {TYPE_LABEL[p.type] ?? p.type}{p.course ? ` · ${p.course._count.modules} módulo${p.course._count.modules !== 1 ? "s" : ""}` : ""}
                </p>
                <div className="mt-3 flex items-end justify-between gap-2">
                  <span className={cn("text-lg font-extrabold", active ? "text-foreground" : "text-foreground-muted")}>{Number(p.price) === 0 ? "Grátis" : formatCurrency(Number(p.price))}</span>
                  <span className="text-[11px] text-foreground-muted">{sales} venda{sales !== 1 ? "s" : ""}</span>
                </div>
              </div>
            </Link>
          );
        })}

        <Link href="/admin/products?novo=1"
          className="hidden min-h-[240px] flex-col items-center justify-center gap-2 rounded-[14px] border-2 border-dashed border-line-strong text-sm font-medium text-foreground-muted transition-colors hover:border-brand hover:text-brand sm:flex dark:border-white/15">
          <span className="grid h-10 w-10 place-items-center rounded-full border border-line-strong bg-card dark:border-white/15"><Plus className="h-4 w-4 text-brand" /></span>
          Novo curso
        </Link>

        {products.length === 0 && (
          <div className="col-span-full rounded-[14px] border border-dashed border-border py-14 text-center text-sm text-foreground-muted">
            {status || tipo || q ? "Nenhum produto com este filtro." : "Nenhum produto ainda."}
          </div>
        )}
      </div>
    </div>
  );
}
