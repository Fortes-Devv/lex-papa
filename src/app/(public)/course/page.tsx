import Link from "next/link";
import { notFound } from "next/navigation";
import { Play, Clock, Award, Check, ShoppingCart, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { db } from "@/lib/db";
import { formatCurrency, formatDuration } from "@/lib/utils/cn";
import { CourseCurriculum } from "@/components/course/course-curriculum";

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
  const discount = product.comparePrice ? Math.round(((Number(product.comparePrice) - Number(product.price)) / Number(product.comparePrice)) * 100) : 0;

  return (
    <div>
      <div className="bg-sidebar border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-12 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              {product.category && <Badge variant="default">{product.category.name}</Badge>}
              {product.isFeatured && <Badge variant="warning">Destaque</Badge>}
            </div>
            <h1 className="text-3xl font-bold text-foreground leading-tight">{product.title}</h1>
            <p className="text-lg text-foreground-muted">{product.shortDescription}</p>
            <div className="flex items-center gap-4 text-sm">
              {product.rating > 0 && (
                <div className="flex items-center gap-1 text-warning font-semibold">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-4 w-4 ${i < Math.floor(product.rating) ? "fill-current" : "opacity-30"}`} />
                  ))}
                  <span className="text-foreground ml-1">{product.rating.toFixed(1)}</span>
                </div>
              )}
              {product.reviewCount > 0 && <span className="text-foreground-muted">({product.reviewCount} avaliações)</span>}
              <span className="text-foreground-muted">{product.enrolledCount.toLocaleString()} alunos</span>
            </div>
            {instructor && (
              <div className="flex items-center gap-3">
                <Avatar src={instructor.avatar ?? undefined} name={instructor.name} size="sm" />
                <span className="text-sm text-foreground-muted">Criado por <strong className="text-primary">{instructor.name}</strong></span>
              </div>
            )}
            <div className="flex items-center gap-4 text-xs text-foreground-muted">
              <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{formatDuration(course.totalDuration)}</span>
              <span className="flex items-center gap-1"><Play className="h-3.5 w-3.5" />{course.totalLessons} aulas</span>
              {course.completionCertificate && <span className="flex items-center gap-1"><Award className="h-3.5 w-3.5" />Certificado</span>}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="rounded-xl border border-border bg-card shadow-xl overflow-hidden sticky top-4">
              <div className="relative aspect-video bg-black cursor-pointer group">
                <img src={product.thumbnail} className="w-full h-full object-cover opacity-80" alt={product.title} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-14 w-14 rounded-full bg-primary/90 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xl">
                    <Play className="h-6 w-6 text-white ml-0.5" />
                  </div>
                </div>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold text-foreground">{formatCurrency(Number(product.price))}</span>
                  {product.comparePrice && (
                    <span className="text-foreground-muted line-through text-base">{formatCurrency(Number(product.comparePrice))}</span>
                  )}
                  {discount > 0 && <Badge variant="destructive">{discount}% OFF</Badge>}
                </div>
                <Link href={`/checkout?productId=${product.id}`} className="block w-full">
                  <Button size="xl" className="w-full" leftIcon={<ShoppingCart className="h-5 w-5" />}>
                    Comprar agora
                  </Button>
                </Link>
                <p className="text-center text-xs text-foreground-muted">Garantia de 7 dias ou dinheiro de volta</p>
                <div className="space-y-1.5 text-xs text-foreground-muted">
                  {["Acesso vitalício", ...(course.completionCertificate ? ["Certificado de conclusão"] : []), "Suporte da comunidade"].map((f) => (
                    <div key={f} className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-success" />{f}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {course.whatYouLearn && course.whatYouLearn.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-foreground mb-4">O que você vai aprender</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {course.whatYouLearn.map((item) => (
                  <div key={item} className="flex items-start gap-2 text-sm text-foreground">
                    <Check className="h-4 w-4 text-success shrink-0 mt-0.5" />
                    {item}
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="text-xl font-bold text-foreground mb-4">Conteúdo do curso</h2>
            <p className="text-sm text-foreground-muted mb-4">{course.totalLessons} aulas · {formatDuration(course.totalDuration)} de conteúdo</p>
            <CourseCurriculum
              modules={course.modules.map((m) => ({
                id: m.id,
                title: m.title,
                lessons: m.lessons.map((l) => ({ id: l.id, title: l.title, isFree: l.isFree, duration: l.duration })),
              }))}
            />
          </section>
        </div>
      </div>
    </div>
  );
}
