"use client";
import { useState } from "react";
import Link from "next/link";
import { Plus, Search, BookOpen, Clock, Users, ChevronRight, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/toast";
import { MOCK_COURSES, MOCK_MODULES, MOCK_PRODUCTS } from "@/lib/mock/data";
import { formatDuration } from "@/lib/utils/cn";

export default function AdminCoursesPage() {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>("mod_1");
  const { success } = useToast();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Cursos</h1>
          <p className="text-sm text-foreground-muted mt-0.5">Gerencie módulos e aulas</p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />}>Novo curso</Button>
      </div>

      <div className="max-w-sm">
        <Input placeholder="Buscar curso..." leftIcon={<Search className="h-4 w-4" />} value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Course with modules */}
      {MOCK_COURSES.map((course) => {
        const product = MOCK_PRODUCTS.find((p) => p.id === course.productId);
        return (
          <div key={course.id} className="rounded-lg border border-border bg-card overflow-hidden">
            {/* Course header */}
            <div className="flex items-center gap-4 p-4 border-b border-border bg-muted/20">
              <img src={product?.thumbnail} className="h-14 w-24 rounded object-cover shrink-0" alt={product?.title} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="font-semibold text-foreground text-sm truncate">{product?.title}</h2>
                  <Badge variant="success">Publicado</Badge>
                </div>
                <div className="flex items-center gap-4 text-xs text-foreground-muted">
                  <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" />{course.totalLessons} aulas</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDuration(course.totalDuration)}</span>
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" />{product?.enrolledCount} alunos</span>
                </div>
              </div>
              <Link href="/admin/products">
                <Button variant="outline" size="sm">Editar curso</Button>
              </Link>
            </div>

            {/* Modules */}
            <div className="divide-y divide-border">
              {MOCK_MODULES.map((mod) => (
                <div key={mod.id}>
                  <button
                    className="flex w-full items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
                    onClick={() => setExpanded(expanded === mod.id ? null : mod.id)}
                  >
                    <GripVertical className="h-4 w-4 text-foreground-subtle cursor-grab shrink-0" />
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-2xs font-bold flex items-center justify-center shrink-0">{mod.order}</span>
                    <span className="flex-1 text-sm font-medium text-foreground truncate">{mod.title}</span>
                    <span className="text-xs text-foreground-muted shrink-0">{mod.lessons.length} aulas</span>
                    <ChevronRight className={`h-4 w-4 text-foreground-muted transition-transform shrink-0 ${expanded === mod.id ? "rotate-90" : ""}`} />
                  </button>

                  {expanded === mod.id && (
                    <div className="bg-muted/10 border-t border-border">
                      {mod.lessons.map((lesson) => (
                        <div key={lesson.id} className="flex items-center gap-3 px-10 py-2.5 hover:bg-muted/20 transition-colors border-b border-border last:border-0">
                          <GripVertical className="h-3.5 w-3.5 text-foreground-subtle cursor-grab shrink-0" />
                          <span className="text-xs text-foreground-muted w-4 shrink-0">{lesson.order}.</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground truncate">{lesson.title}</p>
                          </div>
                          <Badge variant="secondary" className="capitalize">{lesson.type}</Badge>
                          {lesson.duration && <span className="text-xs text-foreground-muted shrink-0">{formatDuration(lesson.duration)}</span>}
                          {lesson.isFree && <Badge variant="success">Grátis</Badge>}
                          <Badge variant={lesson.status === "published" ? "success" : "secondary"}>{lesson.status === "published" ? "Pub." : "Rascunho"}</Badge>
                        </div>
                      ))}
                      <div className="px-10 py-2">
                        <Button variant="ghost" size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => success("Aula criada!")}>
                          Adicionar aula
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="px-4 py-3 border-t border-border">
              <Button variant="ghost" size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => success("Módulo criado!")}>
                Adicionar módulo
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
