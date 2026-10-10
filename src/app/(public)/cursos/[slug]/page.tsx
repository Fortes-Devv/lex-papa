// Dinâmica: registra o "último curso aberto" do aluno logado (usa a sessão).
export const dynamic = "force-dynamic";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import type { Metadata } from "next";
import { Check, ChevronLeft, Lock, ShieldCheck, Star, Users, Clock, BookOpen, Sparkles } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isEnrollmentActive } from "@/lib/access";
import { disciplineName, subjectInitials } from "@/lib/discipline";
import { formatCurrency, formatDuration } from "@/lib/utils/cn";
import { heroGradient } from "@/lib/constants/hero-themes";
import { CdnImg } from "@/components/ui/cdn-img";
import { SalesCurriculum, type SalesDiscipline } from "@/components/sales/sales-curriculum";

// Curso publicado pelo slug. `cache` evita consultar duas vezes (metadata + página).
const getCourseProduct = cache(async (slug: string) =>
  db.product.findFirst({
    where: { type: "course", status: "published", slug },
    include: {
      category: true,
      instructors: { select: { name: true } },
      course: {
        include: {
          modules: {
            orderBy: { order: "asc" },
            where: { isPublished: true, section: "aulas" },
            include: {
              module: {
                include: {
                  instructor: { select: { name: true } },
                  lessons: {
                    orderBy: { order: "asc" },
                    where: { status: "published" },
                    select: { id: true, title: true, type: true, duration: true, videoUrl: true, videoProvider: true, videoPublicId: true, pdfUrl: true, _count: { select: { materials: true } } },
                  },
                },
              },
            },
          },
        },
      },
    },
  }),
);

// Título, descrição e capa para Google e para a prévia do link (WhatsApp, Instagram...).
export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await props.params;
  const product = await getCourseProduct(slug);
  if (!product) return { title: "Curso não encontrado" };
  const url = `/cursos/${product.slug}`;
  return {
    title: product.title,
    description: product.shortDescription,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      title: product.title,
      description: product.shortDescription,
      images: product.thumbnail ? [{ url: product.thumbnail, alt: product.title }] : undefined,
    },
    twitter: { card: "summary_large_image", title: product.title, description: product.shortDescription, images: product.thumbnail ? [product.thumbnail] : undefined },
  };
}

const initials = (name: string) => {
  const p = name.trim().split(/\s+/).filter(Boolean);
  return ((p[0]?.[0] ?? "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
};

// Página do curso / venda (modelo 7g): capa, conteúdo por disciplina e caixa de compra fixa. Sem aula grátis.
export default async function PublicCoursePage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const product = await getCourseProduct(slug);
  if (!product || !product.course) notFound();

  // Registra o "último curso aberto" e vê se o aluno logado já tem o curso.
  const session = await auth();
  let owned = false;
  if (session?.user?.id) {
    await db.user.update({ where: { id: session.user.id }, data: { lastViewedProductId: product.id } }).catch(() => {});
    const enrollment = await db.enrollment.findUnique({ where: { userId_productId: { userId: session.user.id, productId: product.id } } });
    owned = isEnrollmentActive(enrollment);
  }

  const course = product.course;
  const modules = course.modules.map((cm) => cm.module);
  const price = Number(product.price);
  const comparePrice = product.comparePrice ? Number(product.comparePrice) : 0;
  const discount = comparePrice > price ? Math.round(((comparePrice - price) / comparePrice) * 100) : 0;

  // Disciplinas: módulos "X Aulas" + "X PDFs" juntos.
  const groups = new Map<string, SalesDiscipline>();
  for (const m of modules) {
    const name = disciplineName(m.title);
    const key = name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    const g = groups.get(key) ?? { key, name, instructorName: m.instructor?.name ?? null, initials: subjectInitials(name), lessons: [], seconds: 0, pdfs: 0 };
    for (const l of m.lessons) {
      const hasVideo = Boolean(l.videoUrl || l.videoPublicId);
      const isPdf = l.type === "pdf" || (!hasVideo && !!l.pdfUrl);
      g.lessons.push({ id: l.id, title: l.title, duration: l.duration, isPdf });
      g.seconds += l.duration ?? 0;
      if (isPdf) g.pdfs += 1;
    }
    groups.set(key, g);
  }
  const disciplines = [...groups.values()].filter((d) => d.lessons.length > 0);
  const allLessons = modules.flatMap((m) => m.lessons);
  const totalSeconds = allLessons.reduce((s, l) => s + (l.duration ?? 0), 0);
  const pdfCount = allLessons.filter((l) => l.pdfUrl).length + allLessons.reduce((s, l) => s + l._count.materials, 0);
  const videoCount = allLessons.filter((l) => l.videoUrl || l.videoPublicId).length;
  const teachers = [...new Set(modules.map((m) => m.instructor?.name).filter(Boolean) as string[])];
  const hasLessons = allLessons.length > 0;

  const receives = [
    videoCount ? `${videoCount} aula${videoCount !== 1 ? "s" : ""} em vídeo${totalSeconds ? ` (${formatDuration(totalSeconds)})` : ""}` : null,
    pdfCount ? `${pdfCount} PDF${pdfCount !== 1 ? "s" : ""} para baixar e estudar` : null,
    "Dúvidas com os professores na própria aula",
    "Anotações e progresso salvos em cada aula",
    "Acesso por 1 ano a partir da compra",
    "Estude no celular ou no computador",
  ].filter(Boolean) as string[];

  // Dados estruturados (schema.org) para o Google mostrar o curso com preço.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: product.title,
    description: product.shortDescription,
    image: product.thumbnail || undefined,
    provider: { "@type": "Organization", name: "LEX Concursos" },
    offers: { "@type": "Offer", price: price.toFixed(2), priceCurrency: product.currency || "BRL", availability: "https://schema.org/InStock", category: "Paid" },
  };

  const buyHref = `/checkout?productId=${product.id}`;
  const courseHref = `/student/course?courseId=${course.id}`;
  const priceBlock = (
    <>
      {discount > 0 && (
        <p className="flex items-center gap-2 text-sm">
          <span className="text-foreground-muted line-through">{formatCurrency(comparePrice)}</span>
          <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-bold text-brand-dark dark:bg-brand/15 dark:text-brand">−{discount}%</span>
        </p>
      )}
      <p className="text-[32px] font-extrabold leading-tight tracking-tight text-foreground">{formatCurrency(price)}</p>
      <p className="text-[13px] text-foreground-muted">à vista no Pix ou em até 12x no cartão</p>
    </>
  );

  return (
    <div className="pb-24 lg:pb-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      {/* Topo */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-14 max-w-[1180px] items-center gap-3 px-4 lg:px-8">
          <Link href={session?.user ? "/student/explore" : "/#cursos"} className="inline-flex items-center gap-1 text-sm font-semibold text-foreground-muted hover:text-foreground">
            <ChevronLeft className="h-4 w-4" /> Cursos
          </Link>
          <Link href={session?.user ? "/student/dashboard" : "/"} className="ml-auto flex items-center gap-2" aria-label="LEX Concursos">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-navy"><Image src="/logo.png" alt="" width={22} height={19} className="object-contain" /></span>
            <span className="hidden text-sm font-extrabold text-foreground sm:inline">Lex Concursos</span>
          </Link>
          {!session?.user && <Link href={`/login?callbackUrl=/cursos/${product.slug}`} className="text-sm font-semibold text-brand">Entrar</Link>}
        </div>
      </header>

      <div className="mx-auto grid max-w-[1180px] gap-6 px-4 pt-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8 lg:px-8">
        <div className="min-w-0 space-y-6">
          {/* Título e números */}
          <section className="overflow-hidden rounded-[14px] p-5 text-white lg:p-7" style={{ background: heroGradient(course.heroColor) }}>
            <div className="flex flex-wrap gap-2 text-[11px] font-bold uppercase tracking-wider">
              {product.category && <span className="rounded-full bg-brand px-2.5 py-1">{product.category.name}</span>}
              {!hasLessons && <span className="rounded-full bg-white/10 px-2.5 py-1">Aulas em produção</span>}
            </div>
            <h1 className="mt-3 text-[28px] font-extrabold leading-tight lg:text-[36px]">{product.title}</h1>
            {product.shortDescription && <p className="mt-2 max-w-2xl text-[15px] text-white/75">{product.shortDescription}</p>}
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-white/80">
              {product.reviewCount > 0 && <span className="flex items-center gap-1.5"><Star className="h-4 w-4 fill-brand text-brand" /> {product.rating.toFixed(1).replace(".", ",")} ({product.reviewCount})</span>}
              {product.enrolledCount > 0 && <span className="flex items-center gap-1.5"><Users className="h-4 w-4" /> {product.enrolledCount.toLocaleString("pt-BR")} aluno{product.enrolledCount !== 1 ? "s" : ""}</span>}
              {totalSeconds > 0 && <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> {formatDuration(totalSeconds)} de vídeo</span>}
              {disciplines.length > 0 && <span className="flex items-center gap-1.5"><BookOpen className="h-4 w-4" /> {disciplines.length} disciplina{disciplines.length !== 1 ? "s" : ""}</span>}
              {teachers.length > 0 && <span>Prof. {teachers[0].split(" ")[0]}{teachers.length > 1 ? ` + ${teachers.length - 1}` : ""}</span>}
            </div>
          </section>

          {/* Capa inteira, na proporção original (sem recorte) */}
          <div className="overflow-hidden rounded-[14px] bg-navy">
            <CdnImg src={product.thumbnail} width={1200} loading="eager" alt={product.title} className="block h-auto w-full" />
          </div>

          {/* O que você recebe */}
          <section className="rounded-[14px] border border-border bg-card p-5">
            <h2 className="text-[19px] font-extrabold text-foreground">O que você recebe</h2>
            <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
              {receives.map((r) => (
                <li key={r} className="flex items-start gap-2.5 text-sm text-foreground">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-ok text-white"><Check className="h-3 w-3" /></span>{r}
                </li>
              ))}
            </ul>
          </section>

          {course.whatYouLearn.length > 0 && (
            <section className="rounded-[14px] border border-border bg-card p-5">
              <h2 className="text-[19px] font-extrabold text-foreground">O que você vai aprender</h2>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {course.whatYouLearn.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-foreground"><Check className="mt-0.5 h-4 w-4 shrink-0 text-ok" />{item}</li>
                ))}
              </ul>
            </section>
          )}

          {hasLessons ? (
            <SalesCurriculum disciplines={disciplines} />
          ) : (
            <section className="rounded-[14px] border border-dashed border-border p-10 text-center">
              <Sparkles className="mx-auto h-6 w-6 text-brand" />
              <p className="mt-2 font-bold text-foreground">Aulas em produção</p>
              <p className="mx-auto mt-1 max-w-md text-sm text-foreground-muted">O conteúdo está sendo preparado e será liberado em breve. Garanta sua vaga com o preço de lançamento.</p>
            </section>
          )}

          {product.description && product.description !== product.shortDescription && (
            <section className="rounded-[14px] border border-border bg-card p-5">
              <h2 className="text-[19px] font-extrabold text-foreground">Sobre o curso</h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground-muted">{product.description}</p>
            </section>
          )}
        </div>

        {/* Caixa de compra (fixa no desktop) */}
        <aside className="hidden lg:block">
          <div className="sticky top-6 space-y-4 rounded-[14px] border border-border bg-card p-5 shadow-[0_6px_24px_rgba(31,43,58,.08)]">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-navy text-sm font-extrabold text-brand">{initials(product.title)}</span>
              <span className="min-w-0">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-brand">Curso completo</span>
                <span className="block truncate text-sm font-bold text-foreground">{product.title}</span>
              </span>
            </div>
            {owned ? (
              <>
                <p className="flex items-center gap-2 rounded-lg bg-ok-soft px-3 py-2.5 text-sm font-semibold text-ok-text dark:bg-ok/15 dark:text-ok"><Check className="h-4 w-4" /> Você já tem este curso</p>
                <Link href={courseHref} className="flex h-12 items-center justify-center rounded-xl bg-navy text-[15px] font-bold text-white dark:bg-white dark:text-navy">Ir para o curso</Link>
              </>
            ) : (
              <>
                <div>{priceBlock}</div>
                <Link href={buyHref} className="flex h-12 items-center justify-center rounded-xl bg-brand text-[15px] font-bold text-white shadow-[0_6px_16px_rgba(242,106,27,.3)] hover:bg-brand-dark">Comprar agora</Link>
              </>
            )}
            <ul className="space-y-2 border-t border-line-soft pt-4 text-[13px] text-foreground dark:border-white/10">
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-ok" /> Garantia de 7 dias — devolução total</li>
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-ok" /> Acesso imediato após o pagamento</li>
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-ok" /> Acesso por 1 ano</li>
            </ul>
            <p className="flex items-center justify-center gap-1.5 text-xs text-foreground-muted">
              Pix · Cartão · Boleto · <Lock className="h-3 w-3" /> pagamento seguro
            </p>
          </div>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-foreground-muted"><ShieldCheck className="h-3.5 w-3.5" /> Compra protegida pelo Mercado Pago</p>
        </aside>
      </div>

      {/* Barra de compra fixa (celular) */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
        {owned ? (
          <Link href={courseHref} className="flex h-12 items-center justify-center rounded-xl bg-navy text-[15px] font-bold text-white dark:bg-white dark:text-navy">Você já tem · Ir para o curso</Link>
        ) : (
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1 leading-tight">
              {discount > 0 && <span className="text-xs text-foreground-muted line-through">{formatCurrency(comparePrice)}</span>}
              <p className="text-[20px] font-extrabold text-foreground">{formatCurrency(price)}</p>
              <p className="text-[11px] text-foreground-muted">ou até 12x no cartão</p>
            </div>
            <Link href={buyHref} className="flex h-12 shrink-0 items-center rounded-xl bg-brand px-6 text-[15px] font-bold text-white">Comprar agora</Link>
          </div>
        )}
      </div>
    </div>
  );
}
