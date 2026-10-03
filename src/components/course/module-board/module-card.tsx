"use client";
import { useRef } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Play, MoreHorizontal, ImagePlus, Loader2, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dropdown, type DropdownItem } from "@/components/ui/dropdown";
import { CdnImg } from "@/components/ui/cdn-img";
import { cn } from "@/lib/utils/cn";
import type { EditorModule } from "./types";
import { coverLabel, moduleKind, moduleNumber } from "./utils";

// Capa 16:9 (ex.: 1672×941 ou 1920×1080): imagem enviada ou capa automática (navy + iniciais do professor / número).
export function ModuleCover({ mod, index, size = "md", uploading = false }: { mod: EditorModule; index: number; size?: "sm" | "md"; uploading?: boolean }) {
  const draft = !mod.isPublished;
  return (
    <div className={cn("relative aspect-video w-full overflow-hidden", draft ? "bg-[#3a4454]" : "bg-[#1f2b3a]")}>
      {mod.coverImage ? (
        <CdnImg src={mod.coverImage} width={size === "sm" ? 160 : 640} aspect="16:9" alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
      ) : (
        <span
          className={cn(
            "absolute bottom-3 left-4 font-extrabold leading-none tracking-tight transition-transform duration-300 group-hover:scale-[1.02]",
            size === "sm" ? "text-xl" : "text-[30px] lg:text-[44px]",
            draft ? "text-white/70" : "text-primary",
          )}
        >
          {coverLabel(mod, index)}
        </span>
      )}
      {uploading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#1f2b3a]/70">
          <Loader2 className="h-6 w-6 animate-spin text-white" />
        </div>
      )}
    </div>
  );
}

interface ModuleCardProps {
  mod: EditorModule;
  index: number;
  selected: boolean;
  draggable: boolean;
  uploading: boolean;
  menuItems: DropdownItem[];
  onSelect: () => void;
  onPlay: () => void;
  onCoverFile: (file: File) => void;
  onLongPress: () => void;
}

export function ModuleCard({ mod, index, selected, draggable, uploading, menuItems, onSelect, onPlay, onCoverFile, onLongPress }: ModuleCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: mod.id, disabled: !draggable });
  const fileRef = useRef<HTMLInputElement>(null);
  const pressTimer = useRef<ReturnType<typeof setTimeout>>();
  const kind = moduleKind(mod);
  const playable = kind === "aula" && mod.lessons.some((l) => l.previewUrl);

  // Long-press (toque) abre o menu de ações do módulo no celular.
  const startPress = (e: React.PointerEvent) => {
    if (e.pointerType !== "touch") return;
    pressTimer.current = setTimeout(onLongPress, 500);
  };
  const cancelPress = () => clearTimeout(pressTimer.current);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "group relative min-w-0 rounded-[14px] bg-card text-left outline-none transition-shadow",
        selected
          ? "border-2 border-primary shadow-[0_6px_20px_rgba(242,106,27,.15)]"
          : "border border-border hover:shadow-[0_6px_20px_rgba(31,43,58,.10)] focus-visible:ring-2 focus-visible:ring-primary",
        isDragging && "z-10 opacity-80 shadow-xl",
      )}
      {...attributes}
      data-module-card={mod.id}
      tabIndex={0}
      role="button"
      aria-pressed={selected}
      aria-roledescription={draggable ? "módulo arrastável" : undefined}
      aria-label={`${moduleNumber(index)}: ${mod.title}`}
      onClick={onSelect}
      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onSelect(); } }}
      // Arrastar só com mouse/toque (o teclado reordena pelo menu ⋯).
      onPointerDown={(e) => { startPress(e); listeners?.onPointerDown?.(e); }}
      onPointerUp={cancelPress}
      onPointerLeave={cancelPress}
      onPointerCancel={cancelPress}
      onContextMenu={(e) => { if (window.matchMedia("(pointer: coarse)").matches) { e.preventDefault(); onLongPress(); } }}
    >
      <div className="relative">
        <div className={cn("overflow-hidden", selected ? "rounded-t-[12px]" : "rounded-t-[13px]")}>
          <ModuleCover mod={mod} index={index} uploading={uploading} />
        </div>

        {/* Topo: número do módulo + ações (aparecem no hover) */}
        <span className="absolute left-3 top-2.5 text-[9px] font-bold tracking-wider text-white/60 lg:left-4 lg:top-3 lg:text-[11px]">{moduleNumber(index)}</span>
        <div className="absolute right-2 top-2 flex items-center gap-1 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
          {mod.canEdit && (
            <>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="hidden items-center gap-1 rounded-full bg-black/40 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm transition-colors hover:bg-black/60 lg:inline-flex"
              >
                <ImagePlus className="h-3 w-3" /> Trocar capa
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onCoverFile(f); e.target.value = ""; }}
              />
            </>
          )}
          {menuItems.length > 0 && (
            <Dropdown
              trigger={<span role="button" aria-label="Ações do módulo" className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm hover:bg-black/60 lg:h-7 lg:w-7"><MoreHorizontal className="h-4 w-4" /></span>}
              items={menuItems}
            />
          )}
        </div>

        {/* Play (hover; sempre visível no selecionado) ou selo PDF */}
        {playable ? (
          <button
            type="button"
            aria-label={`Assistir preview de ${mod.title}`}
            onClick={(e) => { e.stopPropagation(); onPlay(); }}
            onPointerDown={(e) => e.stopPropagation()}
            className={cn(
              "absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#1f2b3a] shadow-md transition-opacity lg:h-10 lg:w-10",
              selected ? "opacity-100" : "opacity-100 lg:opacity-0 lg:group-hover:opacity-100",
            )}
          >
            <Play className="ml-0.5 h-3.5 w-3.5 fill-current lg:h-4 lg:w-4" />
          </button>
        ) : kind === "pdf" ? (
          <span className="absolute bottom-3 right-3 flex items-center gap-1 rounded-md bg-white/90 px-1.5 py-0.5 text-[10px] font-bold text-[#1f2b3a]">
            <FileText className="h-3 w-3" /> PDF
          </span>
        ) : null}
      </div>

      <div className="space-y-1.5 p-3 lg:p-3.5">
        <p className="line-clamp-2 text-[12.5px] font-bold leading-snug text-foreground lg:text-sm">{mod.title}</p>
        <div className="flex flex-wrap items-center gap-1.5">
          {mod.instructorName && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary lg:text-[11px]">Prof. {mod.instructorName.split(" ")[0]}</span>
          )}
          <Badge variant={mod.isPublished ? "success" : "secondary"} className="rounded-full text-[10px] lg:text-[11px]">{mod.isPublished ? "Publicado" : "Rascunho"}</Badge>
          <span className="text-[10px] text-foreground-muted lg:text-[11px]">{mod.lessons.length} {kind === "pdf" ? "PDF" + (mod.lessons.length !== 1 ? "s" : "") : "aula" + (mod.lessons.length !== 1 ? "s" : "")}</span>
          {!mod.canEdit && <span className="text-[10px] text-foreground-muted lg:text-[11px]">· só leitura</span>}
        </div>
      </div>
    </div>
  );
}
