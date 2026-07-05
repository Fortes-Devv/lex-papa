export const dynamic = "force-dynamic";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Play, Clock, Check, ShoppingCart, Users, BookOpen, ShieldCheck,
  Smartphone, RefreshCw, Infinity as InfinityIcon, Target, Award, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { db } from "@/lib/db";
import { formatCurrency, formatDuration } from "@/lib/utils/cn";
import { CourseCurriculum } from "@/components/course/course-curriculum";
import { BackButton } from "@/components/ui/back-button";
import { heroGradient } from "@/lib/constants/hero-themes";

// Itens fixos de garantia da plataforma (o que todo curso inclui).
const COURSE_INCLUDES = [
  { icon: InfinityIcon, text: "Acesso vitalício ao curso" },
  { icon: Users, text: "Suporte da comunidade" },
  { icon: Smartphone, text: "Estude pelo celular ou computador" },
  { icon: RefreshCw, text: "Atualizações incluídas até a prova" },
];

// Diferenciais exibidos em "O que está incluso" quando o curso ainda não
// preencheu whatYouLearn.
const DEFAULT_BENEFITS = [
  { icon: Target, title: "Teoria completa", desc: "Conteúdo atualizado e alinhado ao edital." },
  { icon: BookOpen, title: "Foco na aprovação", desc: "Estude com quem entende de concursos." },
  { icon: ShieldCheck, title: "Preparação de verdade", desc: "Material objetivo para o seu concurso." },
  { icon: Award, title: "Preço de lançamento", desc: "Condição especial por tempo limitado." },
];

export default async function PublicCoursePage({ searchParams }: { searchParams: { slug?: string; productId?: string } }) {
  const product = await db.product.findFirst({
    where: {
      type: "course",
      status: "published",
      ...(searchParams.slug ? { slug: searchParams.slug } : {}),
      ...(searchParams.productId ? { id: searchParams.productId } : {}),
    },
    include: {
      category: true,
      instructors: true,
      course: {
        include: {
          modules: {
            orderBy: { order: "asc" },
            where: { isPublished: true },
            include: { lessons: { orderBy: { order: "asc" }, where: { status: "published" } } },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!product || !product.course) notFound();

  const course = product.course;
  const instructor = product.instructors[0];
  const price = Number(product.price);
  const comparePrice = product.comparePrice ? Number(product.comparePrice) : 0;
  const discount = comparePrice ? Math.round(((comparePrice - price) / comparePrice) * 100) : 0;
  const installment = price / 12;
  const hasLessons = course.totalLessons > 0;

  // Destaca a última palavra do título em laranja.
  const words = product.title.trim().split(" ");
  const lastWord = words.length > 1 ? words.pop() : null;
  const leadWords = words.join(" ");

  return (
    <div className="relative">
      {/* ── HERO (seção escura, cor escolhida pelo admin) ─────────── */}
      <section className="relative" style={{ background: heroGradient(course.heroColor) }}>
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(120%_80%_at_80%_0%,rgba(255,255,255,0.10),transparent)]" />
        <div className="relative max-w-6xl mx-auto px-4 pt-6 pb-10 lg:pb-12">
          <div className="space-y-5 lg:max-w-[60%]">
          <BackButton fallbackHref="/" label="Voltar" className="text-white/80 hover:text-white" />

          <div className="flex flex-wrap items-center gap-2">
            {product.category && (
              <span className="inline-flex items-center rounded-full bg-primary/90 px-3 py-1 text-2xs font-bold uppercase tracking-wider text-white">
                {product.category.name}
              </span>
            )}
            {!hasLessons && (
              <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-2xs font-semibold uppercase tracking-wider text-white/70">
                Edital em preparação
              </span>
            )}
          </div>

          <h1 className="font-sans text-4xl sm:text-5xl font-extrabold leading-[1.05] tracking-tight text-white">
            {leadWords}{lastWord && <>{" "}<span className="text-primary">{lastWord}</span></>}
          </h1>

          {product.shortDescription && (
            <p className="font-serif text-lg sm:text-xl text-white/75 leading-relaxed max-w-xl">
              {product.shortDescription}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-1">
            {instructor && (
              <div className="flex items-center gap-2.5">
                <Avatar src={instructor.avatar ?? undefined} name={instructor.name} size="sm" />
                <div className="leading-tight">
                  <p className="text-2xs uppercase tracking-wider text-white/50">Criado por</p>
                  <p className="text-sm font-semibold text-white">{instructor.name}</p>
                </div>
              </div>
            )}
            <span className="flex items-center gap-1.5 text-sm text-white/70">
              <Clock className="h-4 w-4" />{hasLessons ? formatDuration(course.totalDuration) : "Carga horária em breve"}
            </span>
            <span className="flex items-center gap-1.5 text-sm text-white/70">
              <BookOpen className="h-4 w-4" />{course.totalLessons} aulas
            </span>
            <span className="flex items-center gap-1.5 text-sm text-white/70">
              <Users className="h-4 w-4" />{product.enrolledCount.toLocaleString("pt-BR")} alunos
            </span>
          </div>
          </div>
        </div>
      </section>

      {/* ── CONTEÚDO (seção clara) ───────────────────────────────── */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 pb-16 lg:grid lg:grid-cols-3 lg:gap-x-8">
        {/* ── CARD de compra (fixo, sobe sobre o hero) ─────────────── */}
        <div className="lg:col-start-3 lg:row-start-1 lg:-mt-[300px]">
          <div className="sticky top-6 rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
            <div className="relative aspect-video bg-black group cursor-pointer">
              <img src={product.thumbnail} className="h-full w-full object-cover opacity-90 transition-opacity group-hover:opacity-100" alt={product.title} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary shadow-xl transition-transform group-hover:scale-105">
                  <Play className="h-7 w-7 text-white ml-0.5 fill-white" />
                </div>
              </div>
              <span className="absolute bottom-3 left-3 flex items-center gap-1.5 text-xs font-medium text-white/90">
                <Play className="h-3 w-3 fill-white" /> Assista à apresentação
              </span>
            </div>

            <div className="p-5 space-y-4">
              <div className="space-y-1">
                {comparePrice > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-foreground-muted line-through">{formatCurrency(comparePrice)}</span>
                    {discount > 0 && <Badge variant="destructive">{discount}% OFF</Badge>}
                  </div>
                )}
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-extrabold tracking-tight text-foreground">{formatCurrency(price)}</span>
                  <span className="mb-1 text-sm text-foreground-muted">à vista</span>
                </div>
                {price > 0 && (
                  <p className="text-sm text-foreground-muted">ou 12x de {formatCurrency(installment)} no cartão</p>
                )}
              </div>

              <Link href={`/checkout?productId=${product.id}`} className="block w-full">
                <Button size="xl" className="w-full" leftIcon={<ShoppingCart className="h-5 w-5" />}>
                  Comprar agora
                </Button>
              </Link>

              <div className="flex items-center justify-center gap-2 rounded-lg bg-success-muted/50 py-2.5 text-sm font-medium text-success">
                <ShieldCheck className="h-4 w-4" /> Garantia de 7 dias ou dinheiro de volta
              </div>

              <div className="space-y-2.5 border-t border-border pt-4">
                <p className="text-2xs font-bold uppercase tracking-wider text-foreground-subtle">Este curso inclui</p>
                {COURSE_INCLUDES.map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-2.5 text-sm text-foreground">
                    <Icon className="h-4 w-4 shrink-0 text-primary" /> {text}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-foreground-muted">
            <ShieldCheck className="h-3.5 w-3.5" /> Compra 100% segura · Acesso imediato após confirmação
          </p>
        </div>

        {/* ── SEÇÕES (conteúdo) ────────────────────────────────────── */}
        <div className="lg:col-span-2 lg:col-start-1 lg:row-start-1 pt-8 space-y-10">
          {product.description && product.description !== product.shortDescription && (
            <section>
              <h2 className="mb-3 font-sans text-2xl font-bold text-foreground">Sobre o curso</h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-foreground-muted">{product.description}</p>
            </section>
          )}

          <section>
            <div className="mb-4 flex items-center justify-between border-b-2 border-primary/60 pb-2">
              <h2 className="font-sans text-2xl font-bold text-foreground">Conteúdo do curso</h2>
              <span className="text-sm text-foreground-muted">
                {hasLessons ? `${course.totalLessons} aulas · ${formatDuration(course.totalDuration)}` : "Cronograma em breve"}
              </span>
            </div>
            {hasLessons ? (
              <CourseCurriculum
                modules={course.modules.map((m) => ({
                  id: m.id,
                  title: m.title,
                  lessons: m.lessons.map((l) => ({ id: l.id, title: l.title, isFree: l.isFree, duration: l.duration })),
                }))}
              />
            ) : (
              <div className="rounded-2xl border border-dashed border-border p-10 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary-muted">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <p className="font-semibold text-foreground">Aulas em produção</p>
                <p className="mx-auto mt-1 max-w-md text-sm text-foreground-muted">
                  O conteúdo deste curso está sendo preparado e será liberado em breve. Garanta sua vaga com o preço de lançamento.
                </p>
              </div>
            )}
          </section>

          {course.whatYouLearn && course.whatYouLearn.length > 0 && (
            <section>
              <h2 className="mb-4 font-sans text-2xl font-bold text-foreground">O que você vai aprender</h2>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {course.whatYouLearn.map((item) => (
                  <div key={item} className="flex items-start gap-2 text-sm text-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />{item}
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="mb-4 font-sans text-2xl font-bold text-foreground">O que está incluso</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {DEFAULT_BENEFITS.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-muted">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{title}</p>
                    <p className="mt-0.5 text-xs text-foreground-muted">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
