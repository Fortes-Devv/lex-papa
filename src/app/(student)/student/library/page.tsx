"use client";
import { useState } from "react";
import Link from "next/link";
import { Search, Filter, BookOpen, CheckCircle2, Clock, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { MOCK_ENROLLMENTS } from "@/lib/mock/data";
import { useCurrentUser } from "@/lib/store/hooks";
import { formatRelativeDate, formatDuration } from "@/lib/utils/cn";

export default function StudentLibraryPage() {
  const user = useCurrentUser();
  const [search, setSearch] = useState("");
  const enrollments = MOCK_ENROLLMENTS.filter((e) => e.userId === user.id);
  const active = enrollments.filter((e) => e.status === "active" && e.progress < 100);
  const completed = enrollments.filter((e) => e.progress === 100);

  const filtered = (list: typeof enrollments) =>
    list.filter((e) => !search || e.product?.title.toLowerCase().includes(search.toLowerCase()));

  function CourseCard({ enrollment }: { enrollment: typeof enrollments[0] }) {
    const product = enrollment.product!;
    const isComplete = enrollment.progress === 100;
    return (
      <div className="group rounded-lg border border-border bg-card overflow-hidden hover:border-primary/30 hover:shadow-md transition-all duration-200">
        <div className="relative aspect-video overflow-hidden bg-muted">
          <img src={product.thumbnail} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          {isComplete && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <CheckCircle2 className="h-10 w-10 text-success" />
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0">
            <Progress value={enrollment.progress} size="xs" className="rounded-none" />
          </div>
        </div>
        <div className="p-4 space-y-3">
          <h3 className="text-sm font-semibold text-foreground line-clamp-2 leading-snug">{product.title}</h3>
          <div className="flex items-center justify-between text-xs text-foreground-muted">
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Acesso {enrollment.lastAccessedAt ? formatRelativeDate(enrollment.lastAccessedAt) : "—"}</span>
            <span className="font-medium text-foreground">{enrollment.progress}%</span>
          </div>
          <div className="flex gap-2">
            <Link href="/student/player" className="flex-1">
              <Button size="sm" className="w-full">{isComplete ? "Revisar" : "Continuar"}</Button>
            </Link>
            {isComplete && (
              <Link href="/student/certificates">
                <Button size="sm" variant="outline">Certificado</Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Minha Biblioteca</h1>
          <p className="text-sm text-foreground-muted mt-0.5">{enrollments.length} cursos</p>
        </div>
        <Link href="/student/explore">
          <Button variant="outline" leftIcon={<BookOpen className="h-4 w-4" />}>Explorar cursos</Button>
        </Link>
      </div>

      <div className="max-w-sm">
        <Input placeholder="Buscar curso..." leftIcon={<Search className="h-4 w-4" />} value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Em andamento ({active.length})</TabsTrigger>
          <TabsTrigger value="completed">Concluídos ({completed.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          {filtered(active).length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered(active).map((e) => <CourseCard key={e.id} enrollment={e} />)}
            </div>
          ) : (
            <EmptyState icon={<BookOpen className="h-5 w-5" />} title="Nenhum curso em andamento" description="Explore nosso catálogo e comece a aprender hoje." action={{ label: "Explorar cursos", href: "/student/explore" }} />
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-4">
          {filtered(completed).length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered(completed).map((e) => <CourseCard key={e.id} enrollment={e} />)}
            </div>
          ) : (
            <EmptyState icon={<CheckCircle2 className="h-5 w-5" />} title="Nenhum curso concluído ainda" description="Continue seus estudos e conquiste seu primeiro certificado." />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
