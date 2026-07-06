"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  CheckCircle2, Circle, Lock, ChevronRight, ArrowLeft,
  Video, FileText, HelpCircle, Download, Music, Dumbbell,
} from "lucide-react";
import { VideoPlayer } from "@/components/player/video-player";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { useCurrentUser } from "@/lib/store/hooks";
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
const typeLabels: Record<string, string> = {
  video: "Vídeo", text: "Texto", quiz: "Quiz", pdf: "PDF",
  download: "Download", audio: "Áudio", exercise: "Exercício", live: "Ao vivo",
};

export function PlayerClient({
  courseTitle, modules, initialLessonId, isEnrolled, backHref = "/student/library",
}: {
  courseTitle: string;
  modules: PlayerModule[];
  initialLessonId?: string;
  isEnrolled: boolean;
  backHref?: string;
}) {
  const { success, error } = useToast();
  const router = useRouter();
  const user = useCurrentUser();

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
  const completedCount = completed.size;
  const progress = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
  const currentModule = modules.find((m) => m.lessons.some((l) => l.id === current?.id));
  const currentIndex = current ? allLessons.findIndex((l) => l.id === current.id) + 1 : 0;

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

  const isDone = completed.has(current.id);

  // Lista de conteúdo (usada no painel direito e na versão mobile).
  function lessonList() {
    return modules.map((mod) => {
      const isExpanded = expandedMods.includes(mod.id);
      const modCompleted = mod.lessons.filter((l) => completed.has(l.id)).length;
      const modDuration = mod.lessons.reduce((s, l) => s + (l.duration ?? 0), 0);
      return (
        <div key={mod.id} className="border-b border-border">
          <button
            className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-muted/30"
            onClick={() => setExpandedMods((prev) => (isExpanded ? prev.filter((id) => id !== mod.id) : [...prev, mod.id]))}
          >
            <ChevronRight className={cn("h-4 w-4 shrink-0 text-foreground-muted transition-transform", isExpanded && "rotate-90")} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">{mod.title}</p>
              <p className="text-2xs text-foreground-muted">
                {modCompleted} de {mod.lessons.length} aulas{modDuration > 0 ? ` · ${formatDuration(modDuration)}` : ""}
              </p>
            </div>
          </button>
          {isExpanded && mod.lessons.map((lesson) => {
            const done = completed.has(lesson.id);
            const isCurrent = current.id === lesson.id;
            return (
              <button
                key={lesson.id}
                disabled={lesson.locked}
                onClick={() => selectLesson(lesson)}
                className={cn(
                  "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                  isCurrent ? "border-l-2 border-l-primary bg-primary/5" : "border-l-2 border-l-transparent hover:bg-muted/20"
                )}
              >
                <span className="mt-0.5 shrink-0">
                  {done ? (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : lesson.locked ? (
                    <Lock className="h-4 w-4 text-foreground-subtle" />
                  ) : isCurrent ? (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full border-2 border-primary">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    </span>
                  ) : (
                    <Circle className="h-4 w-4 text-foreground-subtle" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-2">
                    <span className={cn("text-sm leading-snug", isCurrent ? "font-semibold text-foreground" : "text-foreground")}>{lesson.title}</span>
                    {isCurrent && <span className="shrink-0 text-2xs font-bold uppercase tracking-wide text-primary">Assistindo</span>}
                  </span>
                  <span className="mt-1 flex items-center gap-1.5 text-2xs text-foreground-muted">
                    {typeIcons[lesson.type]} {typeLabels[lesson.type] ?? lesson.type}
                    {lesson.duration ? ` · ${formatDuration(lesson.duration)}` : ""}
                    {lesson.isFree && <Badge variant="secondary" className="ml-1 text-2xs">Grátis</Badge>}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      );
    });
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-background">
      {/* Barra de topo */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-3 sm:px-4">
        <Link href={backHref} className="flex items-center gap-1.5 text-sm text-foreground-muted transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Voltar</span>
        </Link>
        <div className="flex min-w-0 items-center gap-2.5 border-l border-border pl-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white">
            <Image src="/logo.png" alt="LEX" width={22} height={19} className="object-contain" />
          </div>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold text-foreground">{courseTitle}</p>
            <p className="truncate text-2xs text-foreground-muted">
              {currentModule?.title} · Aula {currentIndex} de {totalLessons}
            </p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <div className="hidden w-40 items-center gap-2 sm:flex">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
            <span className="shrink-0 text-2xs font-medium text-foreground-muted">{progress}% concluído</span>
          </div>
          {user && (
            <div className="flex items-center gap-2">
              <Avatar src={user.avatar} name={user.name} size="sm" />
              <span className="hidden text-sm font-medium text-foreground md:block">{user.name.split(" ")[0]}</span>
            </div>
          )}
        </div>
      </header>

      {/* Corpo */}
      <div className="flex min-h-0 flex-1">
        {/* Conteúdo principal */}
        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
          <div className="bg-black">
            {current.videoUrl ? (
              <VideoPlayer key={current.id} title={current.title} watermark="LEX Concursos" src={current.videoUrl} onComplete={handleComplete} className="w-full" />
            ) : (
              <div className="flex aspect-video w-full items-center justify-center text-sm text-white/50">
                {current.type === "video" ? "Vídeo ainda não enviado para esta aula." : "Esta aula não tem vídeo."}
              </div>
            )}
          </div>

          <div className="mx-auto w-full max-w-4xl space-y-5 p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                {currentModule && (
                  <p className="text-2xs font-bold uppercase tracking-wider text-primary">{currentModule.title}</p>
                )}
                <h1 className="mt-1 font-sans text-2xl font-bold text-foreground">{current.title}</h1>
                <p className="mt-1 text-sm text-foreground-muted">
                  {current.duration ? `${Math.round(current.duration / 60)} min · ` : ""}Curso {courseTitle}
                </p>
              </div>
              {isEnrolled && (
                <Button
                  onClick={handleComplete}
                  variant={isDone ? "secondary" : "outline"}
                  disabled={isDone}
                  leftIcon={<CheckCircle2 className={cn("h-4 w-4", isDone ? "" : "text-success")} />}
                >
                  {isDone ? "Concluída" : (
                    <>Marcar como concluída <span className="ml-1.5 font-bold text-success">+20 XP</span></>
                  )}
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
                  className="min-h-[200px] w-full resize-none rounded-lg border border-input bg-background p-4 text-sm text-foreground placeholder:text-foreground-subtle focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Escreva suas anotações sobre esta aula..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-xs text-foreground-muted">Suas notas ficam salvas nesta aula.</p>
                  <Button size="sm" onClick={handleSaveNote} loading={savingNote}>Salvar nota</Button>
                </div>
              </TabsContent>

              <TabsContent value="description" className="mt-4">
                <p className="whitespace-pre-wrap text-sm text-foreground-muted">{current.description ?? "Sem descrição."}</p>
              </TabsContent>
            </Tabs>

            {/* Lista de conteúdo (mobile) */}
            <div className="lg:hidden">
              <p className="mb-2 text-sm font-semibold text-foreground">Conteúdo do curso</p>
              <div className="overflow-hidden rounded-xl border border-border">{lessonList()}</div>
            </div>
          </div>
        </div>

        {/* Painel de conteúdo (desktop) */}
        <aside className="hidden w-80 shrink-0 flex-col overflow-hidden border-l border-border bg-card lg:flex xl:w-96">
          <div className="shrink-0 border-b border-border p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-foreground">Conteúdo do curso</p>
              <span className="text-2xs text-foreground-muted">{completedCount} de {totalLessons} aulas</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto no-scrollbar">{lessonList()}</div>
        </aside>
      </div>
    </div>
  );
}
