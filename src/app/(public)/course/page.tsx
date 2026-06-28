"use client";
import { useState } from "react";
import Link from "next/link";
import { Play, Clock, Users, Star, Award, Check, Lock, ChevronDown, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar } from "@/components/ui/avatar";
import { MOCK_PRODUCTS, MOCK_COURSES, MOCK_MODULES, MOCK_USERS } from "@/lib/mock/data";
import { formatCurrency, formatDuration } from "@/lib/utils/cn";
import { cn } from "@/lib/utils/cn";

export default function PublicCoursePage() {
  const product = MOCK_PRODUCTS[0];
  const course = MOCK_COURSES[0];
  const instructor = MOCK_USERS[1];
  const [expandedMod, setExpandedMod] = useState<string | null>("mod_1");
  const discount = product.comparePrice ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100) : 0;

  return (
    <div>
      {/* Hero */}
      <div className="bg-sidebar border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-12 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="default">{product.category?.name}</Badge>
              <Badge variant="warning">Bestseller</Badge>
            </div>
            <h1 className="text-3xl font-bold text-foreground leading-tight">{product.title}</h1>
            <p className="text-lg text-foreground-muted">{product.shortDescription}</p>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1 text-warning font-semibold">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={cn("h-4 w-4", i < Math.floor(product.rating) ? "fill-current" : "opacity-30")} />
                ))}
                <span className="text-foreground ml-1">{product.rating}</span>
              </div>
              <span className="text-foreground-muted">({product.reviewCount} avaliações)</span>
              <span className="text-foreground-muted">{product.enrolledCount.toLocaleString()} alunos</span>
            </div>
            <div className="flex items-center gap-3">
              <Avatar src={instructor.avatar} name={instructor.name} size="sm" />
              <span className="text-sm text-foreground-muted">Criado por <strong className="text-primary">{instructor.name}</strong></span>
            </div>
            <div className="flex items-center gap-4 text-xs text-foreground-muted">
              <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{formatDuration(course.totalDuration)}</span>
              <span className="flex items-center gap-1"><Play className="h-3.5 w-3.5" />{course.totalLessons} aulas</span>
              <span className="flex items-center gap-1"><Award className="h-3.5 w-3.5" />Certificado</span>
            </div>
          </div>

          {/* Sticky buy card */}
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
                  <span className="text-3xl font-bold text-foreground">{formatCurrency(product.price)}</span>
                  {product.comparePrice && (
                    <span className="text-foreground-muted line-through text-base">{formatCurrency(product.comparePrice)}</span>
                  )}
                  {discount > 0 && <Badge variant="destructive">{discount}% OFF</Badge>}
                </div>
                <Link href="/checkout" className="block w-full">
                  <Button size="xl" className="w-full" leftIcon={<ShoppingCart className="h-5 w-5" />}>
                    Comprar agora
                  </Button>
                </Link>
                <Link href="/checkout" className="block w-full">
                  <Button size="lg" variant="outline" className="w-full">Adicionar ao carrinho</Button>
                </Link>
                <p className="text-center text-xs text-foreground-muted">Garantia de 7 dias ou dinheiro de volta</p>
                <div className="space-y-1.5 text-xs text-foreground-muted">
                  {["Acesso vitalício", "Certificado de conclusão", "Suporte da comunidade", "Materiais de estudo"].map((f) => (
                    <div key={f} className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-success" />{f}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* What you'll learn */}
          <section>
            <h2 className="text-xl font-bold text-foreground mb-4">O que você vai aprender</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(course.whatYouLearn ?? []).map((item) => (
                <div key={item} className="flex items-start gap-2 text-sm text-foreground">
                  <Check className="h-4 w-4 text-success shrink-0 mt-0.5" />
                  {item}
                </div>
              ))}
            </div>
          </section>

          {/* Curriculum */}
          <section>
            <h2 className="text-xl font-bold text-foreground mb-4">Conteúdo do curso</h2>
            <p className="text-sm text-foreground-muted mb-4">{course.totalLessons} aulas · {formatDuration(course.totalDuration)} de conteúdo</p>
            <div className="rounded-lg border border-border overflow-hidden">
              {MOCK_MODULES.map((mod) => (
                <div key={mod.id}>
                  <button
                    className="flex w-full items-center justify-between px-4 py-3 bg-muted/30 border-b border-border hover:bg-muted/60 transition-colors text-left"
                    onClick={() => setExpandedMod(expandedMod === mod.id ? null : mod.id)}
                  >
                    <div className="flex items-center gap-2">
                      <ChevronDown className={cn("h-4 w-4 text-foreground-muted transition-transform", expandedMod !== mod.id && "-rotate-90")} />
                      <span className="text-sm font-semibold text-foreground">{mod.title}</span>
                    </div>
                    <span className="text-xs text-foreground-muted">{mod.lessons.length} aulas</span>
                  </button>
                  {expandedMod === mod.id && (
                    <div className="divide-y divide-border">
                      {mod.lessons.map((lesson) => (
                        <div key={lesson.id} className="flex items-center gap-3 px-4 py-2.5">
                          {lesson.isFree ? <Play className="h-3.5 w-3.5 text-primary shrink-0" /> : <Lock className="h-3.5 w-3.5 text-foreground-subtle shrink-0" />}
                          <span className={cn("flex-1 text-sm", lesson.isFree ? "text-primary" : "text-foreground")}>{lesson.title}</span>
                          {lesson.isFree && <Badge variant="success" className="text-2xs">Grátis</Badge>}
                          {lesson.duration && <span className="text-xs text-foreground-muted">{formatDuration(lesson.duration)}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
