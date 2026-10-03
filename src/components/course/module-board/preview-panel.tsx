"use client";

import { Play, FileText, Download, MoreHorizontal, Plus, Pencil, EyeOff, Video, HardDrive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dropdown, type DropdownItem } from "@/components/ui/dropdown";
import { VideoPlayer } from "@/components/player/video-player";
import { pdfDownloadHref } from "@/components/player/pdf-viewer";
import { cn } from "@/lib/utils/cn";
import type { EditorLesson, EditorModule } from "./types";
import { formatClock, isPdfLesson } from "./utils";

interface PreviewPanelProps {
  mod: EditorModule;
  lesson: EditorLesson | null;
  playing: boolean; // o player já foi iniciado para esta aula
  onPlay: () => void;
  onSelectLesson: (lesson: EditorLesson) => void;
  onEditModule?: () => void;
  onAddLesson?: () => void;
  onImportDrive?: () => void;
  onPublishAll?: () => void;
  lessonMenu: (lesson: EditorLesson, index: number) => DropdownItem[];
  headerMenu?: React.ReactNode; // ⋯ do módulo (folha do celular)
  className?: string;
}

// Moldura 16:9 do preview: capa com selo PREVIEW e play laranja; ao tocar, o player do aluno.
function PreviewStage({ lesson, playing, onPlay }: { lesson: EditorLesson | null; playing: boolean; onPlay: () => void }) {
  if (lesson && isPdfLesson(lesson) && lesson.pdfUrl) {
    return (
      <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-[#1f2b3a] to-[#0f1620] px-6 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20 text-primary"><FileText className="h-6 w-6" /></span>
        <p className="line-clamp-2 text-sm font-semibold text-white">{lesson.title}</p>
        <a href={pdfDownloadHref(lesson.id)} download>
          <Button size="sm" leftIcon={<Download className="h-3.5 w-3.5" />}>Baixar PDF</Button>
        </a>
      </div>
    );
  }

  if (lesson?.previewUrl && playing) {
    return <VideoPlayer key={lesson.id} src={lesson.previewUrl} title={lesson.title} autoPlay className="w-full" />;
  }

  return (
    <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-[#1f2b3a] to-[#0f1620]">
      {lesson?.thumbUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- miniatura assinada do Bunny
        <img src={lesson.thumbUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-50" />
      )}
      <span className="absolute left-3 top-3 rounded bg-black/40 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-white">PREVIEW</span>
      {lesson?.previewUrl ? (
        <button
          type="button"
          onClick={onPlay}
          aria-label={`Assistir ${lesson.title}`}
          className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-white shadow-[0_8px_24px_rgba(242,106,27,.45)] transition-transform hover:scale-105"
        >
          <Play className="ml-1 h-6 w-6 fill-current" />
        </button>
      ) : (
        <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-xs text-white/60">
          {lesson ? "Esta aula não tem vídeo." : "Nenhuma aula ainda."}
        </p>
      )}
      {lesson?.previewUrl && (
        <div className="absolute inset-x-3 bottom-2.5">
          <div className="h-[3px] rounded-full bg-white/25"><div className="h-full w-0 rounded-full bg-primary" /></div>
          <div className="mt-1.5 flex justify-between text-[10px] text-white/70">
            <span>00:00 / {formatClock(lesson.duration) || "--:--"}</span>
            <span>Clique para assistir</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function PreviewPanel({ mod, lesson, playing, onPlay, onSelectLesson, onEditModule, onAddLesson, onImportDrive, onPublishAll, lessonMenu, headerMenu, className }: PreviewPanelProps) {
  const hint = mod.usedIn.length > 0;
  const meta = [
    mod.instructorName ? `Prof. ${mod.instructorName.split(" ")[0]}` : null,
    lesson?.duration ? formatClock(lesson.duration) : null,
    lesson?.isFree ? "Grátis" : null,
  ].filter(Boolean).join(" · ");

  return (
    // O painel inteiro rola (vídeo, título e lista juntos): com a lista rolando sozinha
    // num espaço fixo, ela ficava minúscula em telas baixas. Os botões ficam presos embaixo.
    <div className={cn("flex min-h-0 flex-col overflow-y-auto overscroll-contain rounded-2xl border border-border bg-card", className)}>
      <div className="shrink-0 overflow-hidden rounded-t-2xl bg-black">
        <PreviewStage lesson={lesson} playing={playing} onPlay={onPlay} />
      </div>

      <div className="flex shrink-0 items-start gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-bold uppercase tracking-wider text-primary">{mod.title}</p>
          <p className="mt-0.5 line-clamp-2 text-[15px] font-bold text-foreground">{lesson?.title ?? "Nenhuma aula ainda"}</p>
          {meta && <p className="mt-0.5 text-xs text-foreground-muted">{meta}</p>}
          {hint && <p className="mt-1 text-[11px] text-foreground-muted">Também em: {mod.usedIn.join(", ")}. Editar as aulas altera todos.</p>}
        </div>
        {headerMenu}
      </div>

      {/* Aulas em rascunho: o aluno não vê até publicar */}
      {onPublishAll && mod.lessons.some((l) => l.status !== "published") && (
        <div className="flex shrink-0 items-center gap-3 border-b border-border bg-brand-soft/60 px-4 py-2.5 dark:bg-brand/10">
          <EyeOff className="h-4 w-4 shrink-0 text-brand" />
          <p className="min-w-0 flex-1 text-xs text-foreground">
            {(() => { const n = mod.lessons.filter((l) => l.status !== "published").length; return `${n} aula${n !== 1 ? "s" : ""} oculta${n !== 1 ? "s" : ""} para o aluno`; })()}
          </p>
          <Button size="sm" onClick={onPublishAll}>Publicar todas</Button>
        </div>
      )}

      {/* Lista de aulas */}
      <div className="flex-1">
        {mod.lessons.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
            <Video className="h-6 w-6 text-foreground-subtle" />
            <p className="text-sm text-foreground-muted">Nenhuma aula ainda</p>
            {onAddLesson && <Button size="sm" onClick={onAddLesson} leftIcon={<Plus className="h-3.5 w-3.5" />}>Adicionar aula</Button>}
            {onImportDrive && <Button size="sm" variant="outline" onClick={onImportDrive} leftIcon={<HardDrive className="h-3.5 w-3.5" />}>Importar do Google Drive</Button>}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {mod.lessons.map((l, i) => {
              const active = lesson?.id === l.id;
              const draft = l.status !== "published";
              const pdf = isPdfLesson(l);
              const items = lessonMenu(l, i);
              return (
                <li key={l.id} className={cn("flex min-h-[48px] items-center gap-3 px-4 py-2", active && "bg-primary/10")}>
                  <button type="button" onClick={() => onSelectLesson(l)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <span className={cn("relative flex h-[30px] w-12 shrink-0 items-center justify-center overflow-hidden rounded-md", l.previewUrl || pdf ? "bg-[#1f2b3a] text-white/70" : "bg-muted text-foreground-subtle")}>
                      {l.thumbUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- miniatura assinada do Bunny
                        <img src={l.thumbUrl} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                      ) : pdf ? <FileText className="h-3.5 w-3.5" /> : l.previewUrl ? <Play className="h-3 w-3 fill-current" /> : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cn("block truncate text-[13px] font-semibold", draft || (!l.previewUrl && !pdf) ? "text-foreground-muted" : "text-foreground")}>{l.title}</span>
                      <span className="flex flex-wrap items-center gap-x-1.5 text-[11px] text-foreground-muted">
                        {pdf ? "PDF" : l.duration ? formatClock(l.duration) : l.previewUrl ? "Vídeo" : "Sem vídeo"}
                        {l.isFree && <span>· Grátis</span>}
                        {l.materials.length > 0 && <span className="inline-flex items-center gap-0.5">· <FileText className="h-3 w-3" /> {l.materials.length} PDF{l.materials.length !== 1 ? "s" : ""}</span>}
                        {draft && <span className="inline-flex items-center gap-0.5">· <EyeOff className="h-3 w-3" /> oculta para o aluno</span>}
                      </span>
                    </span>
                    {active && playing && <span className="shrink-0 text-[11px] font-semibold text-primary">Reproduzindo</span>}
                  </button>
                  {items.length > 0 && (
                    <Dropdown
                      trigger={<span role="button" aria-label={`Ações da aula ${l.title}`} className="flex h-9 w-9 items-center justify-center rounded-md text-foreground-muted hover:bg-muted hover:text-foreground"><MoreHorizontal className="h-4 w-4" /></span>}
                      items={items}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {(onEditModule || onAddLesson) && mod.lessons.length > 0 && (
        <div className="sticky bottom-0 z-10 flex shrink-0 gap-2 border-t border-border bg-card p-3">
          {onEditModule && <Button variant="outline" className="h-12 flex-1 rounded-xl lg:h-9 lg:rounded-lg" onClick={onEditModule} leftIcon={<Pencil className="h-3.5 w-3.5" />}>Editar módulo</Button>}
          {onAddLesson && <Button className="h-12 flex-1 rounded-xl bg-[#1f2b3a] text-white hover:bg-[#1f2b3a]/90 lg:h-9 lg:rounded-lg" onClick={onAddLesson} leftIcon={<Plus className="h-3.5 w-3.5" />}>Adicionar aula</Button>}
          {onImportDrive && <Button variant="outline" aria-label="Importar do Google Drive" title="Importar do Google Drive" className="h-12 shrink-0 rounded-xl px-3 lg:h-9 lg:rounded-lg" onClick={onImportDrive}><HardDrive className="h-4 w-4" /></Button>}
        </div>
      )}
    </div>
  );
}
