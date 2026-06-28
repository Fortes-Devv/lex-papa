"use client";
import { useState } from "react";
import { CheckCircle2, Circle, Lock, ChevronDown, ChevronRight, MessageSquare, Download, FileText } from "lucide-react";
import { VideoPlayer } from "@/components/player/video-player";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { MOCK_MODULES, MOCK_COURSES, MOCK_PRODUCTS } from "@/lib/mock/data";
import { formatDuration } from "@/lib/utils/cn";
import { cn } from "@/lib/utils/cn";

export default function PlayerPage() {
  const { success } = useToast();
  const [currentLesson, setCurrentLesson] = useState(MOCK_MODULES[0].lessons[0]);
  const [completedLessons, setCompletedLessons] = useState<string[]>(["les_1"]);
  const [expandedMods, setExpandedMods] = useState<string[]>(["mod_1"]);

  const course = MOCK_COURSES[0];
  const product = MOCK_PRODUCTS.find((p) => p.id === course.productId)!;
  const totalLessons = MOCK_MODULES.reduce((s, m) => s + m.lessons.length, 0);
  const progress = Math.round((completedLessons.length / totalLessons) * 100);

  function markComplete() {
    if (!completedLessons.includes(currentLesson.id)) {
      setCompletedLessons((p) => [...p, currentLesson.id]);
      success("Aula concluída! +50 XP");
    }
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden -m-6">
      {/* Sidebar — lesson list */}
      <aside className="hidden lg:flex w-72 xl:w-80 flex-col border-r border-border bg-sidebar overflow-hidden">
        <div className="p-4 border-b border-border shrink-0">
          <p className="text-xs font-semibold text-foreground truncate">{product.title}</p>
          <Progress value={progress} size="xs" showLabel label={`${progress}% concluído`} className="mt-2" />
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {MOCK_MODULES.map((mod) => {
            const isExpanded = expandedMods.includes(mod.id);
            const modCompleted = mod.lessons.filter((l) => completedLessons.includes(l.id)).length;
            return (
              <div key={mod.id}>
                <button
                  className="flex w-full items-center gap-2 px-4 py-3 border-b border-border hover:bg-muted/30 text-left transition-colors"
                  onClick={() => setExpandedMods((prev) => isExpanded ? prev.filter((id) => id !== mod.id) : [...prev, mod.id])}
                >
                  <ChevronRight className={cn("h-3.5 w-3.5 text-foreground-muted transition-transform shrink-0", isExpanded && "rotate-90")} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{mod.title}</p>
                    <p className="text-2xs text-foreground-muted">{modCompleted}/{mod.lessons.length} aulas</p>
                  </div>
                </button>
                {isExpanded && (
                  <div>
                    {mod.lessons.map((lesson) => {
                      const isDone = completedLessons.includes(lesson.id);
                      const isCurrent = currentLesson.id === lesson.id;
                      return (
                        <button
                          key={lesson.id}
                          disabled={!lesson.isFree && lesson.order > 2}
                          onClick={() => setCurrentLesson(lesson)}
                          className={cn(
                            "flex w-full items-start gap-3 px-4 py-2.5 border-b border-border/50 last:border-0 text-left transition-colors",
                            isCurrent ? "bg-primary/8 border-l-2 border-l-primary" : "hover:bg-muted/20",
                            "disabled:opacity-50 disabled:cursor-not-allowed"
                          )}
                        >
                          <div className="mt-0.5 shrink-0">
                            {isDone ? <CheckCircle2 className="h-3.5 w-3.5 text-success" /> : !lesson.isFree && lesson.order > 2 ? <Lock className="h-3.5 w-3.5 text-foreground-subtle" /> : <Circle className={cn("h-3.5 w-3.5", isCurrent ? "text-primary" : "text-foreground-subtle")} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={cn("text-xs leading-snug", isCurrent ? "text-primary font-medium" : "text-foreground")}>{lesson.title}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant="secondary" className="text-2xs capitalize">{lesson.type}</Badge>
                              {lesson.duration && <span className="text-2xs text-foreground-muted">{formatDuration(lesson.duration)}</span>}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Video */}
        <div className="bg-black">
          <VideoPlayer
            title={currentLesson.title}
            watermark="LEX Concursos"
            onComplete={markComplete}
            className="max-w-5xl mx-auto"
          />
        </div>

        {/* Lesson info */}
        <div className="flex-1 max-w-5xl mx-auto w-full p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-lg font-semibold text-foreground">{currentLesson.title}</h1>
              <p className="text-sm text-foreground-muted mt-0.5">{currentLesson.description ?? "Aula do curso " + product.title}</p>
            </div>
            <Button onClick={markComplete} variant={completedLessons.includes(currentLesson.id) ? "secondary" : "default"} size="sm">
              {completedLessons.includes(currentLesson.id) ? "✓ Concluída" : "Marcar como concluída"}
            </Button>
          </div>

          <Tabs defaultValue="materials">
            <TabsList>
              <TabsTrigger value="materials">Materiais</TabsTrigger>
              <TabsTrigger value="comments">Comentários</TabsTrigger>
              <TabsTrigger value="notes">Notas</TabsTrigger>
            </TabsList>

            <TabsContent value="materials" className="mt-4">
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors group">
                  <FileText className="h-4 w-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">Guia Completo — Server Components.pdf</p>
                    <p className="text-xs text-foreground-muted">PDF · 1.2 MB</p>
                  </div>
                  <Button size="xs" variant="ghost" leftIcon={<Download className="h-3.5 w-3.5" />}>Baixar</Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="comments" className="mt-4">
              <div className="space-y-4">
                <div className="flex gap-3">
                  <img src="https://i.pravatar.cc/32?img=9" className="h-8 w-8 rounded-full border border-border shrink-0" alt="User" />
                  <div className="flex-1">
                    <textarea className="w-full rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-foreground-subtle p-3 resize-none focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px]" placeholder="Deixe um comentário ou dúvida..." />
                    <div className="flex justify-end mt-2">
                      <Button size="sm" onClick={() => success("Comentário enviado!")}>Comentar</Button>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-foreground-muted text-center py-4">Seja o primeiro a comentar nesta aula.</p>
              </div>
            </TabsContent>

            <TabsContent value="notes" className="mt-4">
              <textarea
                className="w-full rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-foreground-subtle p-4 resize-none focus:outline-none focus:ring-2 focus:ring-ring min-h-[200px]"
                placeholder="Escreva suas anotações sobre esta aula..."
              />
              <div className="flex justify-end mt-2">
                <Button size="sm" onClick={() => success("Notas salvas!")}>Salvar notas</Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
