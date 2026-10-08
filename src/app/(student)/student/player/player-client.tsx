"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2, Circle, Lock, ChevronRight, ChevronLeft, Play, Loader2,
  FileText, HelpCircle, Download, ExternalLink, ArrowRight,
} from "lucide-react";
import { VideoPlayer } from "@/components/player/video-player";
import { QuizPlayer, type StudentQuiz } from "@/components/player/quiz-player";
import { pdfDownloadHref } from "@/components/player/pdf-viewer";
import { LessonQuestions } from "@/components/player/lesson-questions";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { formatDuration, cn } from "@/lib/utils/cn";
import { markLessonComplete, saveLessonNote, saveWatchProgress } from "@/lib/actions/learning";

export interface PlayerLesson {
  id: string;
  title: string;
  type: string;
  duration: number | null;
  videoUrl: string | null;
  hasPdf: boolean;
  materials: { id: string; title: string }[]; // PDFs anexados (vazio se bloqueada)
  description: string | null;
  isFree: boolean;
  locked: boolean;
  isCompleted: boolean;
  note: string;
  position?: number; // segundos onde o aluno parou
  releaseAt?: string | null; // módulo ainda fechado: libera nesta data (dd/mm)
  pdfReleaseAt?: string | null; // PDFs da aula liberam nesta data
  quiz?: StudentQuiz | null;
}
export interface PlayerModule {
  id: string;
  title: string;
  instructorName?: string | null;
  lessons: PlayerLesson[];
}

type Mode = "video" | "split" | "pdf";
type Tab = "aulas" | "capitulos" | "pdf" | "notas" | "duvidas" | "descricao";

// Capítulos a partir da descrição: linhas como "11:40 Princípios expressos".
function parseChapters(description: string | null) {
  if (!description) return [];
  const out: { t: number; label: string }[] = [];
  for (const line of description.split(/\r?\n/)) {
    const m = line.match(/^\s*(?:(\d{1,2}):)?(\d{1,2}):(\d{2})\s*[-–—:]?\s*(.+)$/);
    if (m) out.push({ t: Number(m[1] ?? 0) * 3600 + Number(m[2]) * 60 + Number(m[3]), label: m[4].trim() });
  }
  return out.length >= 2 ? out : [];
}
const stamp = (t: number) => formatDuration(t);

// Player (modelos 7c e 8c): vídeo com modos Vídeo / Vídeo + PDF / Só PDF, abas
// Aulas · Capítulos · PDF · Anotações · Dúvidas, lista do módulo e "Próxima aula" fixa.
export function PlayerClient({
  courseId, courseTitle, modules, initialLessonId, initialTab, isEnrolled, backHref, buyHref,
}: {
  courseId: string;
  courseTitle: string;
  modules: PlayerModule[];
  initialLessonId?: string;
  initialTab?: Tab;
  isEnrolled: boolean;
  backHref?: string;
  buyHref?: string;
}) {
  const { success, error } = useToast();
  const router = useRouter();

  const allLessons = modules.flatMap((m) => m.lessons);
  const firstPlayable = allLessons.find((l) => !l.locked) ?? allLessons[0];
  const initial = (initialLessonId && allLessons.find((l) => l.id === initialLessonId && !l.locked)) || firstPlayable;

  const [currentId, setCurrentId] = useState(initial?.id);
  const [completed, setCompleted] = useState<Set<string>>(new Set(allLessons.filter((l) => l.isCompleted).map((l) => l.id)));
  const [positions, setPositions] = useState<Record<string, number>>(() => Object.fromEntries(allLessons.map((l) => [l.id, l.position ?? 0])));
  const [notes, setNotes] = useState<Record<string, string>>(() => Object.fromEntries(allLessons.map((l) => [l.id, l.note])));
  const [savingNote, setSavingNote] = useState(false);
  const [expandedMods, setExpandedMods] = useState<string[]>([]);
  const [nextCountdown, setNextCountdown] = useState<number | null>(null);
  const [autoPlayNext, setAutoPlayNext] = useState(false);
  const [mode, setMode] = useState<Mode>("video");
  const [tab, setTab] = useState<Tab>(initialTab ?? "notas");
  const seekRef = useRef<((s: number) => void) | null>(null);

  const current = allLessons.find((l) => l.id === currentId) ?? initial;
  const currentModule = modules.find((m) => m.lessons.some((l) => l.id === current?.id));
  const idxInModule = currentModule && current ? currentModule.lessons.findIndex((l) => l.id === current.id) : -1;
  const currentIdx = current ? allLessons.findIndex((l) => l.id === current.id) : -1;
  const nextLesson = currentIdx >= 0 ? allLessons.slice(currentIdx + 1).find((l) => !l.locked) ?? null : null;
  const totalLessons = allLessons.length;
  const progress = totalLessons > 0 ? Math.round((completed.size / totalLessons) * 100) : 0;
  const back = backHref ?? `/student/course?courseId=${courseId}${currentModule ? `&modulo=${currentModule.id}` : ""}`;

  // Modo de leitura lembrado neste aparelho.
  useEffect(() => {
    try { const saved = localStorage.getItem("playerMode"); if (saved === "split" || saved === "pdf") setMode(saved); } catch { /* sem storage */ }
  }, []);
  function changeMode(m: Mode) {
    setMode(m);
    try { localStorage.setItem("playerMode", m); } catch { /* sem storage */ }
  }
  // Abre o módulo da aula atual na lista.
  useEffect(() => {
    if (currentModule && !expandedMods.includes(currentModule.id)) setExpandedMods((p) => [...p, currentModule.id]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentModule?.id]);

  // ── Progresso do vídeo: onde parou + tempo assistido (meta da semana) ──────
  const track = useRef({ lessonId: current?.id ?? "", last: null as number | null, pending: 0, time: 0, duration: 0 });
  const flush = useCallback(() => {
    const t = track.current;
    if (!isEnrolled || !t.lessonId || (t.pending < 1 && t.time < 1)) return;
    const watched = t.pending;
    t.pending = 0;
    saveWatchProgress(courseId, t.lessonId, t.time, t.duration, watched).catch(() => {});
  }, [courseId, isEnrolled]);
  useEffect(() => {
    // Troca de aula: salva a anterior e zera o rastreio.
    track.current = { lessonId: current?.id ?? "", last: null, pending: 0, time: 0, duration: 0 };
    const onHide = () => { if (document.visibilityState === "hidden") flush(); };
    document.addEventListener("visibilitychange", onHide);
    return () => { document.removeEventListener("visibilitychange", onHide); flush(); };
  }, [current?.id, flush]);
  function onTime(time: number, duration: number) {
    const t = track.current;
    // Só conta tempo tocado de fato (saltos e avanços não contam).
    if (t.last !== null && time > t.last && time - t.last < 3) t.pending += time - t.last;
    t.last = time;
    t.time = time;
    t.duration = duration;
    if (t.pending >= 20) flush();
  }
  function onPause(time: number, duration: number) {
    track.current.time = time;
    track.current.duration = duration;
    track.current.last = null;
    if (current) setPositions((p) => ({ ...p, [current.id]: time }));
    flush();
  }

  function goTo(lesson: PlayerLesson, autoplay = false) {
    if (lesson.locked) return;
    setNextCountdown(null);
    setAutoPlayNext(autoplay);
    setCurrentId(lesson.id);
    if (tab === "capitulos" || tab === "pdf") setTab("notas");
    window.scrollTo({ top: 0 });
    document.getElementById("player-main")?.scrollTo({ top: 0 });
  }

  // Fim do vídeo: conclui (se matriculado) e conta 4 s para a próxima. Aula com quiz: quem decide é o quiz.
  function handleVideoEnded() {
    if (current) setPositions((p) => ({ ...p, [current.id]: 0 }));
    if (current?.quiz) return;
    if (isEnrolled) handleComplete();
    if (nextLesson) setNextCountdown(4);
  }
  function handleQuizPassed() {
    if (!current) return;
    setCompleted((prev) => new Set(prev).add(current.id));
    router.refresh();
  }
  useEffect(() => {
    if (nextCountdown === null) return;
    if (nextCountdown <= 0) {
      const target = nextLesson;
      setNextCountdown(null);
      if (target) goTo(target, true);
      return;
    }
    const t = setTimeout(() => setNextCountdown((n) => (n === null ? null : n - 1)), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextCountdown]);

  async function handleComplete() {
    if (!current || completed.has(current.id)) return;
    const result = await markLessonComplete(courseId, current.id);
    if (!result.success) { error(result.error); return; }
    setCompleted((prev) => new Set(prev).add(current.id));
    success(result.awardedXp ? `Aula concluída! +${result.awardedXp} XP` : "Aula concluída!");
    router.refresh();
  }

  async function handleSaveNote() {
    if (!current) return;
    setSavingNote(true);
    const result = await saveLessonNote(current.id, notes[current.id] ?? "");
    setSavingNote(false);
    if (!result.success) { error(result.error); return; }
    success("Anotação salva!");
  }

  if (!current) {
    return <div className="p-8 text-center text-sm text-foreground-muted">Este curso ainda não tem aulas publicadas.</div>;
  }

  const isDone = completed.has(current.id);
  const files = [
    ...(current.hasPdf ? [{ key: "lesson", title: current.videoUrl ? "PDF da aula" : current.title, href: pdfDownloadHref(current.id) }] : []),
    ...current.materials.map((m) => ({ key: m.id, title: m.title, href: `/api/materials/${m.id}` })),
  ];
  const inlinePdf = files[0] ? `${files[0].href}?inline=1` : null;
  const isVideo = Boolean(current.videoUrl) && current.type !== "quiz";
  const pdfOnly = !current.videoUrl && files.length > 0 && current.type !== "quiz";
  const effectiveMode: Mode = isVideo && inlinePdf ? mode : "video";
  const chapters = parseChapters(current.description);
  const canComplete = isEnrolled && current.type !== "quiz" && !current.quiz;

  const TABS: { id: Tab; label: string; show: boolean; mobileOnly?: boolean }[] = [
    { id: "aulas", label: "Aulas", show: true, mobileOnly: true },
    { id: "capitulos", label: "Capítulos", show: chapters.length > 0 },
    { id: "pdf", label: files.length > 1 ? `PDF da aula · ${files.length}` : "PDF da aula", show: files.length > 0 },
    { id: "notas", label: notes[current.id]?.trim() ? "Anotações •" : "Anotações", show: true },
    { id: "duvidas", label: "Dúvidas", show: true },
    { id: "descricao", label: "Descrição", show: Boolean(current.description?.trim()) },
  ];
  const activeTab = TABS.find((t) => t.id === tab && t.show) ? tab : "notas";

  // Lista de conteúdo: módulo atual aberto, os outros recolhidos.
  const lessonList = (
    <div>
      {modules.map((mod) => {
        const isExpanded = expandedMods.includes(mod.id);
        const modDone = mod.lessons.filter((l) => completed.has(l.id)).length;
        return (
          <div key={mod.id} className="border-b border-line-soft last:border-0 dark:border-white/10">
            <button
              type="button"
              className="flex w-full items-center gap-2.5 px-4 py-3 text-left hover:bg-background"
              onClick={() => setExpandedMods((prev) => (isExpanded ? prev.filter((id) => id !== mod.id) : [...prev, mod.id]))}
              aria-expanded={isExpanded}
            >
              <ChevronRight className={cn("h-4 w-4 shrink-0 text-foreground-muted transition-transform", isExpanded && "rotate-90")} />
              <span className="min-w-0 flex-1">
                <span className={cn("block truncate text-[13px] font-bold", mod.id === currentModule?.id ? "text-brand" : "text-foreground")}>{mod.title}</span>
                <span className="block text-[11px] text-foreground-muted">{modDone} de {mod.lessons.length} aulas</span>
              </span>
            </button>
            {isExpanded && mod.lessons.map((lesson, i) => {
              const done = completed.has(lesson.id);
              const isCurrent = current.id === lesson.id;
              return (
                <button
                  type="button"
                  key={lesson.id}
                  disabled={lesson.locked}
                  onClick={() => goTo(lesson)}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-2.5 text-left disabled:cursor-not-allowed disabled:opacity-50",
                    isCurrent ? "bg-brand-soft dark:bg-brand/10" : "hover:bg-background",
                  )}
                >
                  <span className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold",
                    done ? "bg-ok text-white" : isCurrent ? "bg-brand text-white" : "border border-line-strong text-foreground-muted dark:border-white/20")}>
                    {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : lesson.locked ? <Lock className="h-3 w-3" /> : i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block truncate text-[13px] text-foreground", isCurrent ? "font-bold" : "font-medium")}>{lesson.title}</span>
                    <span className={cn("block text-[11px]", isCurrent ? "font-semibold text-brand" : "text-foreground-muted")}>
                      {lesson.releaseAt ? `Libera em ${lesson.releaseAt}` : isCurrent ? "Assistindo" : done ? "Concluída" : lesson === nextLesson ? "Próxima" : lesson.videoUrl || lesson.type === "video" ? "Vídeo" : lesson.type === "quiz" ? "Quiz" : "PDF"}
                      {lesson.duration ? ` · ${formatDuration(lesson.duration)}` : ""}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );

  const fileList = (
    <ul className="divide-y divide-line-soft dark:divide-white/10">
      {files.map((f) => (
        <li key={f.key} className="flex items-center gap-3 py-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand dark:bg-brand/15"><FileText className="h-4 w-4" /></span>
          <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-foreground">{f.title}</span>
          <a href={`${f.href}?inline=1`} target="_blank" rel="noopener" className="grid h-8 w-8 place-items-center rounded-lg text-foreground-muted hover:bg-background" aria-label={`Abrir ${f.title}`} title="Abrir">
            <ExternalLink className="h-4 w-4" />
          </a>
          <a href={f.href} download className="grid h-8 w-8 place-items-center rounded-lg text-foreground-muted hover:bg-background" aria-label={`Baixar ${f.title}`} title="Baixar">
            <Download className="h-4 w-4" />
          </a>
        </li>
      ))}
    </ul>
  );

  const pdfFrame = inlinePdf && (
    <iframe key={inlinePdf} src={inlinePdf} title={`PDF: ${current.title}`} className="h-full min-h-[60vh] w-full bg-white" />
  );

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-background">
      {/* Topo */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-3 lg:h-16 lg:px-5">
        <Link href={back} className="flex shrink-0 items-center gap-1 text-sm font-semibold text-foreground-muted hover:text-foreground" aria-label="Voltar">
          <ChevronLeft className="h-5 w-5" /> <span className="hidden max-w-[200px] truncate lg:inline">{currentModule?.title ?? courseTitle}</span>
        </Link>
        <div className="min-w-0 flex-1 border-l border-border pl-3 leading-tight">
          <p className="truncate text-[10.5px] font-bold uppercase tracking-wider text-brand">
            {currentModule?.title ?? courseTitle}{idxInModule >= 0 ? ` · Aula ${idxInModule + 1} de ${currentModule!.lessons.length}` : ""}
          </p>
          <p className="truncate text-[14px] font-bold text-foreground lg:text-[15px]">{current.title}</p>
        </div>
        {isVideo && inlinePdf && (
          <div className="hidden shrink-0 rounded-lg border border-border bg-background p-0.5 lg:flex" role="group" aria-label="Modo de leitura">
            {([["video", "Vídeo"], ["split", "Vídeo + PDF"], ["pdf", "Só PDF"]] as const).map(([id, label]) => (
              <button key={id} type="button" onClick={() => changeMode(id)} aria-pressed={effectiveMode === id}
                className={cn("h-8 rounded-md px-3 text-[12.5px] font-semibold", effectiveMode === id ? "bg-navy text-white dark:bg-white dark:text-navy" : "text-foreground-muted hover:text-foreground")}>
                {label}
              </button>
            ))}
          </div>
        )}
        {canComplete && (
          <Button size="sm" variant={isDone ? "secondary" : "outline"} disabled={isDone} onClick={handleComplete}
            className="hidden shrink-0 lg:inline-flex" leftIcon={<CheckCircle2 className={cn("h-4 w-4", !isDone && "text-ok")} />}>
            {isDone ? "Concluída" : "Marcar concluída"}
          </Button>
        )}
        <div className="hidden w-28 shrink-0 items-center gap-2 xl:flex" title={`${progress}% do curso`}>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line dark:bg-white/10"><div className="h-full rounded-full bg-brand" style={{ width: `${progress}%` }} /></div>
          <span className="text-[11px] font-semibold text-foreground-muted">{progress}%</span>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Conteúdo */}
        <div id="player-main" className="min-w-0 flex-1 overflow-y-auto">
          {/* Palco */}
          {current.locked ? (
            <div className="flex aspect-video w-full flex-col items-center justify-center gap-4 bg-black px-6 text-center">
              <Lock className="h-10 w-10 text-white/60" />
              {current.releaseAt ? (
                <p className="max-w-sm text-sm text-white/80">Este módulo será liberado em <b className="text-white">{current.releaseAt}</b>.</p>
              ) : (
                <>
                  <p className="max-w-sm text-sm text-white/70">Esta aula é exclusiva para alunos matriculados no curso.</p>
                  {buyHref && <Link href={buyHref}><Button>Garantir minha vaga</Button></Link>}
                </>
              )}
            </div>
          ) : current.type === "quiz" ? (
            current.quiz ? (
              <QuizPlayer key={current.id} courseId={courseId} lessonId={current.id} quiz={current.quiz} canSubmit={isEnrolled} onPassed={handleQuizPassed} />
            ) : (
              <div className="mx-auto w-full max-w-3xl p-10 text-center text-sm text-foreground-muted">Este quiz ainda não tem questões cadastradas.</div>
            )
          ) : pdfOnly ? (
            <>
              <div className="hidden h-[calc(100vh-4rem)] bg-neutral-800 lg:block">{pdfFrame}</div>
              <div className="bg-navy px-5 py-10 text-center text-white lg:hidden">
                <FileText className="mx-auto h-10 w-10 text-brand" />
                <p className="mt-3 font-bold">{current.title}</p>
                <p className="mt-1 text-xs text-white/60">Material em PDF</p>
                <div className="mt-4 flex justify-center gap-2">
                  <a href={inlinePdf!} target="_blank" rel="noopener" className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-bold"><ExternalLink className="h-4 w-4" /> Abrir</a>
                  <a href={files[0].href} download className="inline-flex h-10 items-center gap-2 rounded-lg bg-white/10 px-4 text-sm font-bold"><Download className="h-4 w-4" /> Baixar</a>
                </div>
              </div>
            </>
          ) : (
            <div className={cn("relative bg-black", effectiveMode === "split" && "lg:grid lg:grid-cols-2", effectiveMode === "pdf" && "lg:bg-neutral-800")}>
              <div className={cn(effectiveMode === "pdf" && "lg:hidden", effectiveMode === "split" && "lg:flex lg:items-center")}>
                {current.videoUrl ? (
                  <VideoPlayer
                    key={current.id}
                    title={current.title}
                    watermark="LEX Concursos"
                    src={current.videoUrl}
                    onComplete={handleVideoEnded}
                    autoPlay={autoPlayNext}
                    startAt={positions[current.id] ?? 0}
                    onTimeUpdate={onTime}
                    onPause={onPause}
                    seekRef={seekRef}
                    className="w-full"
                  />
                ) : (
                  <div className="flex aspect-video w-full items-center justify-center px-6 text-center text-sm text-white/50">
                    {current.pdfReleaseAt ? `O material desta aula será liberado em ${current.pdfReleaseAt}.` : current.type === "video" ? "Vídeo ainda não enviado para esta aula." : "Esta aula não tem vídeo."}
                  </div>
                )}
              </div>
              {effectiveMode !== "video" && <div className={cn("hidden lg:block", effectiveMode === "split" ? "h-[calc(100vh-4rem)] max-h-[720px]" : "h-[calc(100vh-4rem)]")}>{pdfFrame}</div>}

              {nextCountdown !== null && nextLesson && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-black/85 px-6 text-center">
                  <button type="button" onClick={() => goTo(nextLesson, true)} title="Assistir agora"
                    className="relative flex h-20 w-20 items-center justify-center rounded-full bg-brand text-white shadow-xl transition-transform hover:scale-105">
                    <Loader2 className="absolute h-full w-full animate-spin text-white/30" />
                    <Play className="h-8 w-8 fill-white" />
                  </button>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-white/50">Próxima aula em {nextCountdown}s</p>
                    <p className="mt-1 line-clamp-2 max-w-xs font-semibold text-white">{nextLesson.title}</p>
                  </div>
                  <button type="button" onClick={() => setNextCountdown(null)} className="text-sm text-white/60 hover:text-white">Cancelar</button>
                </div>
              )}
            </div>
          )}

          <div className="mx-auto w-full max-w-4xl space-y-4 px-4 pb-28 pt-4 lg:px-6 lg:pb-10">
            {current.pdfReleaseAt && (
              <p className="flex items-center gap-2 rounded-[14px] border border-brand-border bg-brand-soft/60 px-4 py-3 text-sm text-foreground dark:border-brand/30 dark:bg-brand/10">
                <FileText className="h-4 w-4 shrink-0 text-brand" /> Os PDFs desta aula serão liberados em <b>{current.pdfReleaseAt}</b>.
              </p>
            )}
            {/* Ações rápidas */}
            <div className="flex flex-wrap items-center gap-2">
              {canComplete && (
                <Button size="sm" variant={isDone ? "secondary" : "outline"} disabled={isDone} onClick={handleComplete} className="lg:hidden"
                  leftIcon={<CheckCircle2 className={cn("h-4 w-4", !isDone && "text-ok")} />}>
                  {isDone ? "Concluída" : "Marcar concluída"}
                </Button>
              )}
              {files[0] && (
                <a href={files[0].href} download className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong bg-card px-3 text-[13px] font-semibold text-foreground dark:border-white/10">
                  <Download className="h-4 w-4" /> Baixar PDF da aula
                </a>
              )}
              <button type="button" onClick={() => setTab("duvidas")} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong bg-card px-3 text-[13px] font-semibold text-foreground dark:border-white/10">
                <HelpCircle className="h-4 w-4" /> Perguntar ao professor
              </button>
              {currentModule?.instructorName && <span className="text-xs text-foreground-muted">Prof. {currentModule.instructorName.split(" ")[0]}</span>}
            </div>

            {/* Quiz de fixação depois do vídeo */}
            {current.type !== "quiz" && current.quiz && !current.locked && (
              <div className="overflow-hidden rounded-[14px] border border-border bg-card">
                <QuizPlayer key={`quiz-${current.id}`} courseId={courseId} lessonId={current.id} quiz={current.quiz} canSubmit={isEnrolled} onPassed={handleQuizPassed} />
              </div>
            )}

            {/* Abas */}
            <div>
              <div className="-mx-4 flex gap-1 overflow-x-auto border-b border-border px-4 lg:mx-0 lg:px-0" role="tablist">
                {TABS.filter((t) => t.show).map((t) => (
                  <button key={t.id} type="button" role="tab" aria-selected={activeTab === t.id} onClick={() => setTab(t.id)}
                    className={cn("h-10 shrink-0 border-b-2 px-3 text-[13px] font-semibold", t.mobileOnly && "lg:hidden",
                      activeTab === t.id ? "border-brand text-foreground" : "border-transparent text-foreground-muted hover:text-foreground")}>
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="pt-4">
                {activeTab === "aulas" && <div className="overflow-hidden rounded-[14px] border border-border bg-card lg:hidden">{lessonList}</div>}
                {activeTab === "capitulos" && (
                  <ul className="overflow-hidden rounded-[14px] border border-border bg-card">
                    {chapters.map((c) => (
                      <li key={c.t} className="border-b border-line-soft last:border-0 dark:border-white/10">
                        <button type="button" onClick={() => { if (effectiveMode === "pdf") changeMode("video"); seekRef.current?.(c.t); }}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-background">
                          <span className="w-14 shrink-0 font-mono text-xs font-semibold text-brand">{stamp(c.t)}</span>
                          <span className="text-sm text-foreground">{c.label}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {activeTab === "pdf" && <div className="rounded-[14px] border border-border bg-card px-4">{fileList}</div>}
                {activeTab === "notas" && (
                  <div>
                    <textarea
                      className="min-h-[180px] w-full resize-none rounded-[14px] border border-border bg-card p-4 text-sm text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-brand/40"
                      placeholder="Escreva suas anotações sobre esta aula..."
                      value={notes[current.id] ?? ""}
                      onChange={(e) => setNotes((n) => ({ ...n, [current.id]: e.target.value }))}
                    />
                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-xs text-foreground-muted">Ficam salvas nesta aula, só para você.</p>
                      <Button size="sm" onClick={handleSaveNote} loading={savingNote}>Salvar anotação</Button>
                    </div>
                  </div>
                )}
                {activeTab === "duvidas" && <LessonQuestions courseId={courseId} lessonId={current.id} />}
                {activeTab === "descricao" && <p className="whitespace-pre-wrap text-sm text-foreground-muted">{current.description}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Lateral (desktop): lista do curso, material da aula e próxima aula */}
        <aside className="hidden w-[340px] shrink-0 flex-col border-l border-border bg-card lg:flex">
          <div className="shrink-0 border-b border-border px-4 py-3">
            <p className="truncate text-[11px] font-bold uppercase tracking-wider text-brand">{courseTitle}</p>
            <p className="mt-0.5 text-xs text-foreground-muted">{completed.size} de {totalLessons} aulas · {progress}%</p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line dark:bg-white/10"><div className="h-full rounded-full bg-brand" style={{ width: `${progress}%` }} /></div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {lessonList}
            {files.length > 0 && (
              <div className="border-t border-border px-4 pt-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-foreground-muted">Material desta aula</p>
                {fileList}
              </div>
            )}
          </div>
          {nextLesson && (
            <button type="button" onClick={() => goTo(nextLesson)} className="flex shrink-0 items-center gap-2 border-t border-border bg-navy px-4 py-3.5 text-left text-white hover:bg-navy-soft">
              <span className="min-w-0 flex-1">
                <span className="block text-[10.5px] font-bold uppercase tracking-wider text-brand">Próxima aula</span>
                <span className="block truncate text-[13px] font-semibold">{nextLesson.title}</span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0" />
            </button>
          )}
        </aside>
      </div>

      {/* Próxima aula fixa (celular) */}
      {nextLesson && (
        <button type="button" onClick={() => goTo(nextLesson)}
          className="fixed inset-x-3 bottom-3 z-10 flex items-center gap-2 rounded-xl bg-navy px-4 py-3 text-left text-white shadow-lg lg:hidden" style={{ marginBottom: "env(safe-area-inset-bottom)" }}>
          {isDone ? <CheckCircle2 className="h-4 w-4 shrink-0 text-ok" /> : <Circle className="h-4 w-4 shrink-0 text-white/40" />}
          <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">Próxima: {nextLesson.title}</span>
          <ArrowRight className="h-4 w-4 shrink-0" />
        </button>
      )}
      <span className="sr-only" aria-live="polite">{current.title}</span>
    </div>
  );
}
