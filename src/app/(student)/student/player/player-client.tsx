"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, Lock, ChevronRight, Video, FileText, HelpCircle, Download, Music, Dumbbell } from "lucide-react";
import { VideoPlayer } from "@/components/player/video-player";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { formatDuration, cn } from "@/lib/utils/cn";
import { markLessonComplete, saveLessonNote } from "@/lib/actions/learning";

export interface PlayerLesson {
  id: string;
  title: string;
  type: string;
  duration: number | null;
  videoUrl: string | null;
  description: string | null;
  isFree: boolean;
  locked: boolean;
  isCompleted: boolean;
  note: string;
}
export interface PlayerModule {
  id: string;
  title: string;
  lessons: PlayerLesson[];
}

const typeIcons: Record<string, React.ReactNode> = {
  video: <Video className="h-3.5 w-3.5" />,
  text: <FileText className="h-3.5 w-3.5" />,
  quiz: <HelpCircle className="h-3.5 w-3.5" />,
  pdf: <FileText className="h-3.5 w-3.5" />,
  download: <Download className="h-3.5 w-3.5" />,
  audio: <Music className="h-3.5 w-3.5" />,
  exercise: <Dumbbell className="h-3.5 w-3.5" />,
  live: <Video className="h-3.5 w-3.5" />,
};

export function PlayerClient({ courseTitle, modules, initialLessonId, isEnrolled }: { courseTitle: string; modules: PlayerModule[]; initialLessonId?: string; isEnrolled: boolean }) {
  const { success, error } = useToast();
  const router = useRouter();

  const allLessons = modules.flatMap((m) => m.lessons);
  const firstPlayable = allLessons.find((l) => !l.locked) ?? allLessons[0];
  const initial = (initialLessonId && allLessons.find((l) => l.id === initialLessonId)) || firstPlayable;

  const [currentId, setCurrentId] = useState(initial?.id);
  const [completed, setCompleted] = useState<Set<string>>(new Set(allLessons.filter((l) => l.isCompleted).map((l) => l.id)));
  const [expandedMods, setExpandedMods] = useState<string[]>(modules[0] ? [modules[0].id] : []);
  const [note, setNote] = useState(initial?.note ?? "");
  const [savingNote, setSavingNote] = useState(false);

  const current = allLessons.find((l) => l.id === currentId) ?? initial;
  const totalLessons = allLessons.length;
  const progress = totalLessons > 0 ? Math.round((completed.size / totalLessons) * 100) : 0;

  function selectLesson(lesson: PlayerLesson) {
    if (lesson.locked) return;
    setCurrentId(lesson.id);
    setNote(lesson.note);
  }

  async function handleComplete() {
    if (!current || completed.has(current.id)) return;
    const result = await markLessonComplete(current.id);
    if (!result.success) { error(result.error); return; }
    setCompleted((prev) => new Set(prev).add(current.id));
    success(result.awardedXp ? `Aula concluída! +${result.awardedXp} XP` : "Aula concluída!");
    router.refresh();
  }

  async function handleSaveNote() {
    if (!current) return;
    setSavingNote(true);
    await saveLessonNote(current.id, note);
    setSavingNote(false);
    success("Notas salvas!");
  }

  if (!current) {
    return <div className="p-8 text-center text-sm text-foreground-muted">Este curso ainda não tem aulas publicadas.</div>;
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden -m-6">
      <aside className="hidden lg:flex w-72 xl:w-80 flex-col border-r border-border bg-sidebar overflow-hidden">
        <div className="p-4 border-b border-border shrink-0">
          <p className="text-xs font-semibold text-foreground truncate">{courseTitle}</p>
          <Progress value={progress} size="xs" showLabel label={`${progress}% concluído`} className="mt-2" />
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {modules.map((mod) => {
            const isExpanded = expandedMods.includes(mod.id);
            const modCompleted = mod.lessons.filter((l) => completed.has(l.id)).length;
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
                      const isDone = completed.has(lesson.id);
                      const isCurrent = current.id === lesson.id;
                      return (
                        <button
                          key={lesson.id}
                          disabled={lesson.locked}
                          onClick={() => selectLesson(lesson)}
                          className={cn(
                            "flex w-full items-start gap-3 px-4 py-2.5 border-b border-border/50 last:border-0 text-left transition-colors",
                            isCurrent ? "bg-primary/8 border-l-2 border-l-primary" : "hover:bg-muted/20",
                            "disabled:opacity-50 disabled:cursor-not-allowed"
                          )}
                        >
                          <div className="mt-0.5 shrink-0">
                            {isDone ? <CheckCircle2 className="h-3.5 w-3.5 text-success" /> : lesson.locked ? <Lock className="h-3.5 w-3.5 text-foreground-subtle" /> : <Circle className={cn("h-3.5 w-3.5", isCurrent ? "text-primary" : "text-foreground-subtle")} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={cn("text-xs leading-snug", isCurrent ? "text-primary font-medium" : "text-foreground")}>{lesson.title}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-foreground-muted">{typeIcons[lesson.type]}</span>
                              {lesson.duration ? <span className="text-2xs text-foreground-muted">{formatDuration(lesson.duration)}</span> : null}
                              {lesson.isFree && <Badge variant="secondary" className="text-2xs">Grátis</Badge>}
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

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <div className="bg-black">
          {current.videoUrl ? (
            <VideoPlayer key={current.id} title={current.title} watermark="LEX Concursos" src={current.videoUrl} onComplete={handleComplete} className="max-w-5xl mx-auto" />
          ) : (
            <div className="max-w-5xl mx-auto aspect-video flex items-center justify-center text-white/50 text-sm">
              {current.type === "video" ? "Vídeo ainda não enviado para esta aula." : "Esta aula não tem vídeo."}
            </div>
          )}
        </div>

        <div className="flex-1 max-w-5xl mx-auto w-full p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-lg font-semibold text-foreground">{current.title}</h1>
              <p className="text-sm text-foreground-muted mt-0.5">{current.description ?? `Aula do curso ${courseTitle}`}</p>
            </div>
            {isEnrolled && (
              <Button onClick={handleComplete} variant={completed.has(current.id) ? "secondary" : "default"} size="sm" disabled={completed.has(current.id)}>
                {completed.has(current.id) ? "✓ Concluída" : "Marcar como concluída"}
              </Button>
            )}
          </div>

          <Tabs defaultValue="notes">
            <TabsList>
              <TabsTrigger value="notes">Notas</TabsTrigger>
              <TabsTrigger value="description">Descrição</TabsTrigger>
            </TabsList>

            <TabsContent value="notes" className="mt-4">
              <textarea
                className="w-full rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-foreground-subtle p-4 resize-none focus:outline-none focus:ring-2 focus:ring-ring min-h-[200px]"
                placeholder="Escreva suas anotações sobre esta aula..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <div className="flex justify-end mt-2">
                <Button size="sm" onClick={handleSaveNote} loading={savingNote}>Salvar notas</Button>
              </div>
            </TabsContent>

            <TabsContent value="description" className="mt-4">
              <p className="text-sm text-foreground-muted whitespace-pre-wrap">{current.description ?? "Sem descrição."}</p>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
