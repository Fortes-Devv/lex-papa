"use client";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { DndContext, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy } from "@dnd-kit/sortable";
import {
  ChevronLeft, MoreHorizontal, Plus, Layers, Play, ImagePlus, RotateCcw, ArrowUp, ArrowDown,
  Eye, EyeOff, Pencil, Unlink, Trash2, HardDrive,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { Dropdown, type DropdownItem } from "@/components/ui/dropdown";
import { CdnImg } from "@/components/ui/cdn-img";
import { MediaUploader } from "@/components/upload/media-uploader";
import { useToast } from "@/components/ui/toast";
import { LessonFormDialog, type LessonFormValue } from "@/components/course/lesson-form-dialog";
import { DriveImportDialog } from "@/components/course/drive-import-dialog";
import { uploadToCloudinary } from "@/lib/cloudinary-upload";
import { formatCurrency, cn } from "@/lib/utils/cn";
import {
  createModule, renameModule, deleteModule, moveModule, toggleModulePublished, setModulePublished,
  deleteLesson, moveLesson, updateLessonStatus, detachModule, attachModule, listAttachableModules,
  reorderModules, setModuleCover,
} from "@/lib/actions/courses";
import { ModuleCard, ModuleCover } from "./module-card";
import { PreviewPanel } from "./preview-panel";
import { BottomSheet } from "./bottom-sheet";
import type { CourseHeaderInfo, EditorLesson, EditorModule, TeacherOption } from "./types";
import { defaultLesson, hasPlayableVideo, moduleKind, moduleNumber } from "./utils";

type Filter = "all" | "aula" | "pdf" | "draft";
type ActionResult = { success: boolean; error?: string };

const COVER_TYPES = ["image/jpeg", "image/png", "image/webp"];
const COVER_MAX_BYTES = 2 * 1024 * 1024;

function useIsDesktop() {
  const [desktop, setDesktop] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return desktop;
}

interface ModuleBoardProps {
  header: CourseHeaderInfo;
  modules: EditorModule[];
  teachers?: TeacherOption[]; // vazio = não pode escolher o professor (professor)
  restricted?: boolean; // true = não monta o curso (só edita os próprios módulos)
  backHref: string;
  courseMenu?: DropdownItem[]; // ações do curso (editar dados, publicar...)
}

export function ModuleBoard({ header, modules: initialModules, teachers = [], restricted = false, backHref, courseMenu = [] }: ModuleBoardProps) {
  const { success, error } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDesktop = useIsDesktop();
  const dndId = useId(); // id estável: evita diferença de hidratação nos atributos do dnd-kit

  // Ordem local (arrastar e soltar responde na hora; o servidor confirma depois).
  const [modules, setModules] = useState(initialModules);
  useEffect(() => setModules(initialModules), [initialModules]);

  const [filter, setFilter] = useState<Filter>("all");
  const firstWithVideo = initialModules.find(hasPlayableVideo) ?? initialModules[0];
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const fromUrl = searchParams.get("modulo");
    return initialModules.some((m) => m.id === fromUrl) ? fromUrl : firstWithVideo?.id ?? null;
  });
  const selected = modules.find((m) => m.id === selectedId) ?? null;
  const selectedIndex = selected ? modules.indexOf(selected) : -1;
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const lesson = selected ? selected.lessons.find((l) => l.id === lessonId) ?? defaultLesson(selected) : null;

  const [previewSheetOpen, setPreviewSheetOpen] = useState(false);
  const [actionsFor, setActionsFor] = useState<EditorModule | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const coverInput = useRef<HTMLInputElement>(null);
  const coverTarget = useRef<string | null>(null);

  // Diálogo de módulo (novo / editar)
  const [moduleDialog, setModuleDialog] = useState<{ open: boolean; editing: EditorModule | null }>({ open: false, editing: null });
  const [moduleForm, setModuleForm] = useState({ title: "", instructorId: "", cover: "" });
  // Usar módulo existente
  const [attachOpen, setAttachOpen] = useState(false);
  const [attachSearch, setAttachSearch] = useState("");
  const [attachable, setAttachable] = useState<Awaited<ReturnType<typeof listAttachableModules>>>([]);
  const [attachLoading, setAttachLoading] = useState(false);
  // Aula (nova / editar)
  const [driveFor, setDriveFor] = useState<EditorModule | null>(null);
  const [lessonDialog, setLessonDialog] = useState<{ open: boolean; moduleId: string | null; initial: LessonFormValue | null }>({ open: false, moduleId: null, initial: null });

  const report = useCallback((result: ActionResult, ok?: string) => {
    if (!result.success) { error(result.error ?? "Não foi possível concluir."); return false; }
    if (ok) success(ok);
    router.refresh();
    return true;
  }, [error, success, router]);

  // ── Seleção / preview ──────────────────────────────────────────────────
  function selectModule(m: EditorModule, opts: { play?: boolean } = {}) {
    setSelectedId(m.id);
    setLessonId(null);
    setPlaying(!!opts.play);
    // Deep-link sem recarregar a página.
    const url = new URL(window.location.href);
    url.searchParams.set("modulo", m.id);
    window.history.replaceState(null, "", url.toString());
    if (!isDesktop) setPreviewSheetOpen(true);
  }

  function selectLesson(l: EditorLesson) {
    setLessonId(l.id);
    setPlaying(!!l.previewUrl);
  }

  // ── Filtros ────────────────────────────────────────────────────────────
  const counts = useMemo(() => ({
    all: modules.length,
    aula: modules.filter((m) => moduleKind(m) === "aula").length,
    pdf: modules.filter((m) => moduleKind(m) === "pdf").length,
    draft: modules.filter((m) => !m.isPublished).length,
  }), [modules]);
  const visible = modules.filter((m) =>
    filter === "all" ? true : filter === "draft" ? !m.isPublished : moduleKind(m) === filter,
  );
  const canReorder = !restricted && filter === "all";

  // ── Arrastar e soltar ──────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
  );
  async function handleDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const from = modules.findIndex((m) => m.id === e.active.id);
    const to = modules.findIndex((m) => m.id === e.over!.id);
    const next = arrayMove(modules, from, to);
    setModules(next);
    const result = await reorderModules(header.courseId, next.map((m) => m.id));
    if (!result.success) { setModules(modules); error(result.error ?? "Não foi possível reordenar."); return; }
    router.refresh();
  }

  // ── Navegação por teclado entre os cards (setas) ───────────────────────
  function handleGridKeys(e: React.KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
    const cards = Array.from(e.currentTarget.querySelectorAll<HTMLElement>("[data-module-card]"));
    const i = cards.indexOf(document.activeElement as HTMLElement);
    if (i === -1) return;
    const cols = getComputedStyle(e.currentTarget).gridTemplateColumns.split(" ").length || 1;
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -cols, ArrowDown: cols }[e.key as "ArrowLeft"]!;
    const target = cards[Math.min(cards.length - 1, Math.max(0, i + step))];
    e.preventDefault();
    target?.focus();
  }

  // ── Capa ───────────────────────────────────────────────────────────────
  function pickCover(m: EditorModule) {
    coverTarget.current = m.id;
    coverInput.current?.click();
  }
  async function uploadCover(moduleId: string, file: File) {
    if (!COVER_TYPES.includes(file.type)) { error("Use uma imagem JPG, PNG ou WebP."); return; }
    if (file.size > COVER_MAX_BYTES) { error("A capa pode ter no máximo 2 MB."); return; }
    setUploadingId(moduleId);
    try {
      const { url } = await uploadToCloudinary(file, { resourceType: "image", folder: "lms/module-covers" });
      report(await setModuleCover(moduleId, url), "Capa atualizada.");
    } catch (err) {
      error(err instanceof Error ? err.message : "Não foi possível enviar a capa.");
    } finally {
      setUploadingId(null);
    }
  }

  // ── Ações do módulo ────────────────────────────────────────────────────
  function openNewModule() {
    setModuleForm({ title: "", instructorId: "", cover: "" });
    setModuleDialog({ open: true, editing: null });
  }
  function openEditModule(m: EditorModule) {
    setModuleForm({ title: m.title, instructorId: m.instructorId ?? "", cover: m.coverImage ?? "" });
    setModuleDialog({ open: true, editing: m });
  }
  async function saveModule() {
    if (!moduleForm.title.trim()) { error("Dê um título para o módulo."); return; }
    const editing = moduleDialog.editing;
    const instructorId = teachers.length > 0 ? moduleForm.instructorId || null : undefined;
    const result = editing
      ? await renameModule(editing.id, moduleForm.title, instructorId, moduleForm.cover || null)
      : await createModule(header.courseId, moduleForm.title, instructorId ?? null, moduleForm.cover || null);
    if (report(result, editing ? "Módulo atualizado." : "Módulo criado.")) setModuleDialog({ open: false, editing: null });
  }
  async function removeModule(m: EditorModule) {
    const others = m.usedIn.length > 0 ? ` Ele continua nos cursos: ${m.usedIn.join(", ")}.` : "";
    if (!confirm(`Remover o módulo "${m.title}" deste curso?${others}`)) return;
    const result = await detachModule(header.courseId, m.id);
    if (!report(result, "Módulo removido do curso.")) return;
    if (selectedId === m.id) setSelectedId(null);
    if ("orphan" in result && result.orphan && result.canDelete) {
      const msg = `"${m.title}" não está em mais nenhum curso. Excluir DE VEZ o módulo e as ${m.lessons.length} aulas (vídeos apagados do Bunny)?\n\nCancelar = manter guardado para reaproveitar depois.`;
      if (confirm(msg)) report(await deleteModule(m.id), "Módulo excluído.");
    }
  }
  async function togglePublish(m: EditorModule) {
    report(
      m.isPublished ? await toggleModulePublished(header.courseId, m.id, false) : await setModulePublished(header.courseId, m.id, true),
      m.isPublished ? "Módulo despublicado neste curso." : "Módulo publicado.",
    );
  }
  function openNewLesson(m: EditorModule) {
    setLessonDialog({ open: true, moduleId: m.id, initial: null });
  }

  function moduleMenu(m: EditorModule, index: number): DropdownItem[] {
    const items: DropdownItem[] = [{ label: "Assistir preview", icon: <Play className="h-3.5 w-3.5" />, onClick: () => selectModule(m, { play: true }) }];
    if (m.canEdit) {
      items.push({ label: "Trocar capa", icon: <ImagePlus className="h-3.5 w-3.5" />, onClick: () => pickCover(m) });
      if (m.coverImage) items.push({ label: "Voltar para capa automática", icon: <RotateCcw className="h-3.5 w-3.5" />, onClick: async () => report(await setModuleCover(m.id, null), "Capa automática restaurada.") });
      items.push({ label: "Editar módulo", icon: <Pencil className="h-3.5 w-3.5" />, onClick: () => openEditModule(m) });
      items.push({ label: "Adicionar aula", icon: <Plus className="h-3.5 w-3.5" />, onClick: () => openNewLesson(m) });
      items.push({ label: "Importar do Google Drive", icon: <HardDrive className="h-3.5 w-3.5" />, onClick: () => setDriveFor(m) });
    }
    if (!restricted) {
      items.push({ label: "Mover para cima", icon: <ArrowUp className="h-3.5 w-3.5" />, disabled: index === 0, onClick: async () => report(await moveModule(header.courseId, m.id, "up")) });
      items.push({ label: "Mover para baixo", icon: <ArrowDown className="h-3.5 w-3.5" />, disabled: index === modules.length - 1, onClick: async () => report(await moveModule(header.courseId, m.id, "down")) });
      items.push({ label: m.isPublished ? "Despublicar" : "Publicar", icon: m.isPublished ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />, onClick: () => togglePublish(m) });
      items.push({ separator: true });
      items.push({ label: "Remover do curso", icon: <Unlink className="h-3.5 w-3.5" />, variant: "destructive", onClick: () => removeModule(m) });
    }
    return items;
  }

  // ── Ações da aula ──────────────────────────────────────────────────────
  function lessonMenu(m: EditorModule) {
    return (l: EditorLesson, i: number): DropdownItem[] => {
      if (!m.canEdit) return [];
      return [
        {
          label: "Editar aula", icon: <Pencil className="h-3.5 w-3.5" />, onClick: () => setLessonDialog({
            open: true, moduleId: m.id, initial: {
              id: l.id, title: l.title, type: l.type, description: l.description ?? "", videoUrl: l.videoUrl ?? "",
              videoPublicId: l.videoPublicId ?? "", pdfUrl: l.pdfUrl ?? "", duration: l.duration ? String(l.duration) : "",
              isFree: l.isFree, isPreview: l.isPreview, completionCriteria: l.completionCriteria,
              materials: l.materials,
            },
          }),
        },
        { label: l.status === "published" ? "Ocultar do aluno" : "Publicar aula", icon: l.status === "published" ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />, onClick: async () => report(await updateLessonStatus(l.id, l.status === "published" ? "draft" : "published")) },
        { label: "Mover para cima", icon: <ArrowUp className="h-3.5 w-3.5" />, disabled: i === 0, onClick: async () => report(await moveLesson(m.id, l.id, "up")) },
        { label: "Mover para baixo", icon: <ArrowDown className="h-3.5 w-3.5" />, disabled: i === m.lessons.length - 1, onClick: async () => report(await moveLesson(m.id, l.id, "down")) },
        { separator: true },
        {
          label: "Excluir aula", icon: <Trash2 className="h-3.5 w-3.5" />, variant: "destructive", onClick: async () => {
            if (!confirm(`Excluir a aula "${l.title}"? Ela sai de todos os cursos que usam este módulo.`)) return;
            report(await deleteLesson(l.id), "Aula excluída.");
          },
        },
      ];
    };
  }

  // ── Usar módulo existente ──────────────────────────────────────────────
  async function loadAttachable(search: string) {
    setAttachLoading(true);
    setAttachable(await listAttachableModules(header.courseId, search));
    setAttachLoading(false);
  }
  function openAttach() {
    setAttachSearch("");
    setAttachOpen(true);
    loadAttachable("");
  }
  async function handleAttach(moduleId: string) {
    if (report(await attachModule(header.courseId, moduleId), "Módulo adicionado ao curso.")) setAttachOpen(false);
  }

  const totalLessons = modules.reduce((s, m) => s + m.lessons.length, 0);
  const meta = `${modules.length} módulo${modules.length !== 1 ? "s" : ""} · ${totalLessons} aula${totalLessons !== 1 ? "s" : ""} · ${header.enrolledCount} aluno${header.enrolledCount !== 1 ? "s" : ""} · ${formatCurrency(header.price)}`;
  const statusBadge = <Badge variant={header.status === "published" ? "success" : "secondary"} className="rounded-full">{header.status === "published" ? "Publicado" : "Rascunho"}</Badge>;
  const mobileCourseMenu: DropdownItem[] = [
    ...(!restricted ? [{ label: "Usar módulo existente", icon: <Layers className="h-3.5 w-3.5" />, onClick: openAttach }] : []),
    ...courseMenu,
  ];

  const filterChips: { id: Filter; label: string }[] = [
    { id: "all", label: `Todos · ${counts.all}` },
    { id: "aula", label: `Aulas · ${counts.aula}` },
    { id: "pdf", label: `PDFs · ${counts.pdf}` },
    { id: "draft", label: `Rascunhos${counts.draft ? ` · ${counts.draft}` : ""}` },
  ];

  const panel = selected && (
    <PreviewPanel
      key={selected.id}
      mod={selected}
      lesson={lesson}
      playing={playing}
      onPlay={() => setPlaying(true)}
      onSelectLesson={selectLesson}
      onEditModule={selected.canEdit ? () => openEditModule(selected) : undefined}
      onAddLesson={selected.canEdit ? () => openNewLesson(selected) : undefined}
      onImportDrive={selected.canEdit ? () => setDriveFor(selected) : undefined}
      lessonMenu={lessonMenu(selected)}
      className={isDesktop ? "max-h-[calc(100vh-120px)]" : "min-h-0 flex-1 rounded-none border-0"}
      headerMenu={!isDesktop ? (
        <button type="button" aria-label="Ações do módulo" onClick={() => setActionsFor(selected)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-foreground-muted hover:bg-muted">
          <MoreHorizontal className="h-5 w-5" />
        </button>
      ) : undefined}
    />
  );

  return (
    // relative: elementos absolutos internos (ex.: aviso sr-only) ficam presos aqui e não esticam a página.
    <div className="relative space-y-5">
      {/* ── Cabeçalho do curso (desktop) ── */}
      <div className="hidden items-center gap-4 lg:flex">
        <Link href={backHref} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-foreground-muted hover:bg-muted hover:text-foreground" aria-label="Voltar">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[14px] bg-[#1f2b3a]">
          {header.thumbnail && <CdnImg src={header.thumbnail} width={64} aspect="1:1" alt="" className="h-full w-full object-cover" loading="eager" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-[22px] font-bold text-foreground">{header.title}</h1>
            {statusBadge}
          </div>
          <p className="mt-0.5 text-[13px] text-foreground-muted">{meta}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {!restricted && <Button variant="outline" onClick={openAttach} leftIcon={<Layers className="h-4 w-4" />}>Usar módulo existente</Button>}
          {!restricted && <Button onClick={openNewModule} leftIcon={<Plus className="h-4 w-4" />}>Novo módulo</Button>}
          {courseMenu.length > 0 && (
            <Dropdown trigger={<span role="button" aria-label="Ações do curso" className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground-muted hover:bg-muted"><MoreHorizontal className="h-4 w-4" /></span>} items={courseMenu} />
          )}
        </div>
      </div>

      {/* ── Topbar (celular/tablet) ── */}
      <div className="sticky top-0 z-30 -mx-[18px] -mt-[18px] flex items-center gap-2 border-b border-border bg-card px-3 py-2.5 lg:hidden">
        <Link href={backHref} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-foreground-muted" aria-label="Voltar">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold text-foreground">{header.title}</p>
          <p className="truncate text-[11px] text-foreground-muted">{meta}</p>
        </div>
        {mobileCourseMenu.length > 0 && (
          <Dropdown trigger={<span role="button" aria-label="Ações do curso" className="flex h-11 w-11 items-center justify-center rounded-lg text-foreground-muted"><MoreHorizontal className="h-5 w-5" /></span>} items={mobileCourseMenu} />
        )}
      </div>

      {/* ── Filtros ── */}
      <div className="flex items-center gap-3">
        <div className="no-scrollbar -mx-1 flex min-w-0 flex-1 gap-2 overflow-x-auto px-1">
          {filterChips.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setFilter(c.id)}
              className={cn(
                "h-9 shrink-0 rounded-full border px-3.5 text-[13px] font-medium transition-colors",
                filter === c.id ? "border-[#1f2b3a] bg-[#1f2b3a] text-white" : "border-border bg-card text-foreground-muted hover:text-foreground",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
        {canReorder && modules.length > 1 && <span className="hidden shrink-0 text-xs text-foreground-muted lg:inline">Arraste para reordenar</span>}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 pb-24 lg:grid-cols-[minmax(0,1fr)_380px] lg:pb-0">
        {/* ── Grade de capas ── */}
        <DndContext id={dndId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={visible.map((m) => m.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-2 lg:gap-4 xl:grid-cols-3" onKeyDown={handleGridKeys}>
              {visible.map((m) => {
                const index = modules.indexOf(m);
                return (
                  <ModuleCard
                    key={m.id}
                    mod={m}
                    index={index}
                    selected={m.id === selectedId}
                    draggable={canReorder}
                    uploading={uploadingId === m.id}
                    menuItems={moduleMenu(m, index)}
                    onSelect={() => selectModule(m)}
                    onPlay={() => selectModule(m, { play: true })}
                    onCoverFile={(f) => uploadCover(m.id, f)}
                    onLongPress={() => setActionsFor(m)}
                  />
                );
              })}
              {!restricted && (
                <button
                  type="button"
                  onClick={openNewModule}
                  className="hidden min-h-[220px] flex-col items-center justify-center gap-2 rounded-[14px] border-2 border-dashed border-border text-sm font-medium text-foreground-muted transition-colors hover:border-primary/50 hover:text-primary lg:flex"
                >
                  <Plus className="h-5 w-5" /> Novo módulo
                </button>
              )}
              {visible.length === 0 && (
                <div className="col-span-full rounded-[14px] border border-dashed border-border py-14 text-center text-sm text-foreground-muted">
                  {modules.length === 0 ? (restricted ? "Você ainda não tem módulos neste curso." : "Nenhum módulo ainda. Crie o primeiro ou use um módulo existente.") : "Nenhum módulo neste filtro."}
                </div>
              )}
            </div>
          </SortableContext>
        </DndContext>

        {/* ── Painel de preview (desktop) ── */}
        {isDesktop && (
          <aside className="sticky top-5 hidden lg:block">
            {panel ?? (
              <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-foreground-muted">Selecione um módulo para ver o preview.</div>
            )}
          </aside>
        )}
      </div>

      {/* ── FAB "Novo módulo" (celular) ── */}
      {!restricted && (
        <button
          type="button"
          onClick={openNewModule}
          className="fixed bottom-[calc(96px+env(safe-area-inset-bottom))] right-[18px] z-30 flex h-[52px] items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(242,106,27,.45)] lg:hidden"
        >
          <Plus className="h-5 w-5" /> Novo módulo
        </button>
      )}

      {/* ── Folha de preview (celular) ── */}
      <BottomSheet open={!isDesktop && previewSheetOpen && !!selected} onClose={() => { setPreviewSheetOpen(false); setPlaying(false); }} className="h-[75vh]" label="Preview do módulo">
        {panel}
      </BottomSheet>

      {/* ── Menu do módulo (celular: long-press ou ⋯) ── */}
      <BottomSheet open={!!actionsFor} onClose={() => setActionsFor(null)} label="Ações do módulo">
        {actionsFor && (
          <div className="pb-[max(env(safe-area-inset-bottom),12px)]">
            <div className="flex items-center gap-3 border-b border-border px-4 pb-3">
              <button type="button" onClick={() => { const m = actionsFor; setActionsFor(null); if (m.canEdit) pickCover(m); }} className="relative h-[52px] w-[84px] shrink-0 overflow-hidden rounded-lg" aria-label="Trocar capa">
                <ModuleCover mod={actionsFor} index={modules.indexOf(actionsFor)} size="sm" />
                {actionsFor.canEdit && <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-[11px] font-semibold text-white">Trocar</span>}
              </button>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-foreground">{actionsFor.title}</p>
                <p className="text-xs text-foreground-muted">{moduleNumber(modules.indexOf(actionsFor))} · {actionsFor.lessons.length} aulas · {actionsFor.isPublished ? "Publicado" : "Rascunho"}</p>
              </div>
            </div>
            <ul className="py-1">
              {moduleMenu(actionsFor, modules.indexOf(actionsFor)).map((item, i) =>
                item.separator ? (
                  <li key={i} className="my-1 border-t border-border" />
                ) : (
                  <li key={i}>
                    <button
                      type="button"
                      disabled={item.disabled}
                      onClick={() => { setActionsFor(null); if (item.href) window.location.href = item.href; else item.onClick?.(); }}
                      className={cn("flex h-[52px] w-full items-center gap-3 px-5 text-left text-[15px] disabled:opacity-40", item.variant === "destructive" ? "text-destructive" : "text-foreground")}
                    >
                      {item.icon}{item.label}
                    </button>
                  </li>
                ),
              )}
            </ul>
            <div className="px-4">
              <Button variant="outline" className="h-[50px] w-full rounded-xl" onClick={() => setActionsFor(null)}>Cancelar</Button>
            </div>
          </div>
        )}
      </BottomSheet>

      {/* Input escondido para "Trocar capa" vindo dos menus */}
      <input
        ref={coverInput}
        type="file"
        accept={COVER_TYPES.join(",")}
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f && coverTarget.current) uploadCover(coverTarget.current, f); e.target.value = ""; }}
      />

      {/* ── Diálogo: novo / editar módulo ── */}
      <Dialog open={moduleDialog.open} onClose={() => setModuleDialog({ open: false, editing: null })} title={moduleDialog.editing ? "Editar módulo" : "Novo módulo"}>
        <div className="space-y-4">
          <Input label="Título do módulo" placeholder="Ex: Direito Constitucional" value={moduleForm.title} onChange={(e) => setModuleForm((f) => ({ ...f, title: e.target.value }))} />
          {teachers.length > 0 && (
            <Select
              label="Professor responsável"
              hint="O professor escolhido é o dono do módulo: só ele (e o admin) edita as aulas. As iniciais dele aparecem na capa automática."
              value={moduleForm.instructorId}
              onChange={(e) => setModuleForm((f) => ({ ...f, instructorId: e.target.value }))}
              options={[{ value: "", label: "Sem professor específico" }, ...teachers.map((t) => ({ value: t.id, label: t.name }))]}
            />
          )}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Capa do módulo <span className="font-normal text-foreground-muted">(opcional, 16:10)</span></label>
            <MediaUploader resourceType="image" folder="lms/module-covers" value={moduleForm.cover} onUploaded={(r) => setModuleForm((f) => ({ ...f, cover: r.url }))} onRemove={() => setModuleForm((f) => ({ ...f, cover: "" }))} />
            <p className="mt-1 text-xs text-foreground-muted">Sem capa, o módulo usa a capa automática com as iniciais do professor.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setModuleDialog({ open: false, editing: null })}>Cancelar</Button>
          <Button onClick={saveModule}>{moduleDialog.editing ? "Salvar" : "Criar módulo"}</Button>
        </DialogFooter>
      </Dialog>

      {/* ── Diálogo: usar módulo existente ── */}
      <Dialog open={attachOpen} onClose={() => setAttachOpen(false)} title="Usar módulo existente">
        <div className="space-y-3">
          <p className="text-sm text-foreground-muted">O módulo entra neste curso com as mesmas aulas e vídeos — nada é copiado nem reenviado. Alterações nas aulas valem para todos os cursos que usam o módulo.</p>
          <Input placeholder="Buscar pelo nome (ex: Constitucional)" value={attachSearch} onChange={(e) => { setAttachSearch(e.target.value); loadAttachable(e.target.value); }} />
          <div className="max-h-80 divide-y divide-border overflow-y-auto rounded-lg border border-border">
            {attachLoading && attachable.length === 0 ? (
              <p className="p-4 text-center text-sm text-foreground-muted">Carregando…</p>
            ) : attachable.length === 0 ? (
              <p className="p-4 text-center text-sm text-foreground-muted">Nenhum módulo disponível.</p>
            ) : (
              attachable.map((m) => (
                <div key={m.id} className="flex items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{m.title}</p>
                    <p className="truncate text-xs text-foreground-muted">
                      {m.lessonCount} aula{m.lessonCount !== 1 ? "s" : ""}
                      {m.instructorName ? ` · Prof. ${m.instructorName}` : ""}
                      {m.usedIn.length > 0 ? ` · em: ${m.usedIn.join(", ")}` : " · não está em nenhum curso"}
                    </p>
                  </div>
                  <Button size="sm" onClick={() => handleAttach(m.id)} leftIcon={<Plus className="h-3.5 w-3.5" />}>Adicionar</Button>
                </div>
              ))
            )}
          </div>
        </div>
      </Dialog>

      {/* ── Diálogo: nova / editar aula ── */}
      {lessonDialog.moduleId && (
        <LessonFormDialog
          open={lessonDialog.open}
          onClose={() => setLessonDialog((d) => ({ ...d, open: false }))}
          moduleId={lessonDialog.moduleId}
          initial={lessonDialog.initial}
        />
      )}

      {/* ── Diálogo: importar do Google Drive ── */}
      {driveFor && (
        <DriveImportDialog open onClose={() => setDriveFor(null)} moduleId={driveFor.id} moduleTitle={driveFor.title} />
      )}

      {/* Anuncia o módulo selecionado para leitores de tela */}
      <p className="sr-only" aria-live="polite">{selected ? `Selecionado: ${moduleNumber(selectedIndex)}, ${selected.title}` : ""}</p>
    </div>
  );
}
