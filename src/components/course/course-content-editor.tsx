"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus, ChevronRight, ArrowUp, ArrowDown, Trash2, Pencil,
  Video, FileText, HelpCircle, Download, Music, Dumbbell, Eye, EyeOff, Clock, Play, Layers, Link2, Unlink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { MediaUploader } from "@/components/upload/media-uploader";
import { useToast } from "@/components/ui/toast";
import { formatDuration, getInitials } from "@/lib/utils/cn";
import {
  createModule, renameModule, deleteModule, moveModule, toggleModulePublished, setModulePublished,
  deleteLesson, moveLesson, updateLessonStatus, detachModule, attachModule, listAttachableModules,
} from "@/lib/actions/courses";
import { LessonFormDialog, type LessonFormValue } from "./lesson-form-dialog";
import { VideoPlayer } from "@/components/player/video-player";
import type { LessonType } from "@/lib/types";

const typeIcons: Record<LessonType, React.ReactNode> = {
  video: <Video className="h-3.5 w-3.5" />,
  text: <FileText className="h-3.5 w-3.5" />,
  quiz: <HelpCircle className="h-3.5 w-3.5" />,
  pdf: <FileText className="h-3.5 w-3.5" />,
  download: <Download className="h-3.5 w-3.5" />,
  audio: <Music className="h-3.5 w-3.5" />,
  exercise: <Dumbbell className="h-3.5 w-3.5" />,
  live: <Video className="h-3.5 w-3.5" />,
};

export interface EditorLesson {
  id: string;
  title: string;
  type: LessonType;
  status: string;
  order: number;
  duration: number | null;
  videoUrl: string | null;
  previewUrl: string | null; // URL assinada só para a prévia (não salvar)
  videoPublicId: string | null;
  pdfUrl: string | null;
  description: string | null;
  isFree: boolean;
  isPreview: boolean;
  completionCriteria: string;
}

export interface EditorModule {
  id: string;
  title: string;
  order: number;
  isPublished: boolean;
  instructorId: string | null;
  instructorName: string | null;
  instructorAvatar: string | null;
  coverImage: string | null;
  canEdit: boolean; // pode editar o conteúdo (dono do módulo ou admin)
  usedIn: string[]; // outros cursos que usam este módulo
  lessons: EditorLesson[];
}

export interface TeacherOption {
  id: string;
  name: string;
}

export function CourseContentEditor({ courseId, modules, teachers = [], restricted = false }: { courseId: string; modules: EditorModule[]; teachers?: TeacherOption[]; restricted?: boolean }) {
  const { success, error } = useToast();
  const router = useRouter();
  const [expanded, setExpanded] = useState<Set<string>>(new Set(modules[0] ? [modules[0].id] : []));

  const [moduleDialogOpen, setModuleDialogOpen] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [newModuleInstructor, setNewModuleInstructor] = useState("");
  const [newModuleCover, setNewModuleCover] = useState("");
  const [editingModule, setEditingModule] = useState<EditorModule | null>(null);

  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [lessonModuleId, setLessonModuleId] = useState<string | null>(null);
  const [editingLesson, setEditingLesson] = useState<LessonFormValue | null>(null);

  const [previewLesson, setPreviewLesson] = useState<EditorLesson | null>(null);

  // "Usar módulo existente": reaproveita um módulo de outro curso (sem copiar aulas).
  const [attachOpen, setAttachOpen] = useState(false);
  const [attachSearch, setAttachSearch] = useState("");
  const [attachable, setAttachable] = useState<Awaited<ReturnType<typeof listAttachableModules>>>([]);
  const [attachLoading, setAttachLoading] = useState(false);

  async function loadAttachable(search: string) {
    setAttachLoading(true);
    setAttachable(await listAttachableModules(courseId, search));
    setAttachLoading(false);
  }

  function openAttach() {
    setAttachSearch("");
    setAttachOpen(true);
    loadAttachable("");
  }

  async function handleAttach(moduleId: string) {
    const result = await attachModule(courseId, moduleId);
    if (!result.success) { error(result.error); return; }
    success("Módulo adicionado ao curso.");
    setAttachOpen(false);
    router.refresh();
  }

  // Mostra o erro das actions (ex.: sem permissão) em vez de falhar em silêncio.
  function report(result: { success: boolean; error?: string }, ok?: string) {
    if (!result.success) { error(result.error ?? "Não foi possível concluir."); return false; }
    if (ok) success(ok);
    router.refresh();
    return true;
  }

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function openCreateModule() {
    setEditingModule(null);
    setNewModuleTitle("");
    setNewModuleInstructor("");
    setNewModuleCover("");
    setModuleDialogOpen(true);
  }

  function openRenameModule(mod: EditorModule) {
    setEditingModule(mod);
    setNewModuleTitle(mod.title);
    setNewModuleInstructor(mod.instructorId ?? "");
    setNewModuleCover(mod.coverImage ?? "");
    setModuleDialogOpen(true);
  }

  async function handleSaveModule() {
    if (!newModuleTitle) { error("Dê um título para o módulo."); return; }
    const instructorId = newModuleInstructor || null;
    const cover = newModuleCover || null;
    const result = editingModule
      ? await renameModule(editingModule.id, newModuleTitle, instructorId, cover)
      : await createModule(courseId, newModuleTitle, instructorId, cover);
    if (report(result, editingModule ? "Módulo atualizado." : "Módulo criado.")) setModuleDialogOpen(false);
  }

  // Remove o módulo deste curso. As aulas continuam existindo; se o módulo não
  // estiver em mais nenhum curso, oferece excluir de vez.
  async function handleRemoveModule(mod: EditorModule) {
    const others = mod.usedIn.length > 0 ? ` Ele continua nos cursos: ${mod.usedIn.join(", ")}.` : "";
    if (!confirm(`Remover o módulo "${mod.title}" deste curso?${others}`)) return;
    const result = await detachModule(courseId, mod.id);
    if (!report(result, "Módulo removido do curso.")) return;
    if ("orphan" in result && result.orphan && result.canDelete) {
      const msg = `"${mod.title}" não está em mais nenhum curso. Excluir DE VEZ o módulo e as ${mod.lessons.length} aulas (vídeos apagados do Bunny)?\n\nCancelar = manter guardado para reaproveitar depois.`;
      if (confirm(msg)) report(await deleteModule(mod.id), "Módulo excluído.");
    }
  }

  async function handleMoveModule(mod: EditorModule, direction: "up" | "down") {
    report(await moveModule(courseId, mod.id, direction));
  }

  async function handleToggleModule(mod: EditorModule) {
    report(await toggleModulePublished(courseId, mod.id, !mod.isPublished));
  }

  const isModuleAllPublished = (m: EditorModule) =>
    m.isPublished && m.lessons.length > 0 && m.lessons.every((l) => l.status === "published");

  async function handlePublishAll(mod: EditorModule, publish: boolean) {
    report(await setModulePublished(courseId, mod.id, publish), publish ? "Módulo e aulas publicados." : "Módulo despublicado neste curso.");
  }

  function openCreateLesson(moduleId: string) {
    setLessonModuleId(moduleId);
    setEditingLesson(null);
    setLessonDialogOpen(true);
  }

  function openEditLesson(moduleId: string, lesson: EditorLesson) {
    setLessonModuleId(moduleId);
    setEditingLesson({
      id: lesson.id,
      title: lesson.title,
      type: lesson.type,
      description: lesson.description ?? "",
      videoUrl: lesson.videoUrl ?? "",
      videoPublicId: lesson.videoPublicId ?? "",
      pdfUrl: lesson.pdfUrl ?? "",
      duration: lesson.duration ? String(lesson.duration) : "",
      isFree: lesson.isFree,
      isPreview: lesson.isPreview,
      completionCriteria: lesson.completionCriteria,
    });
    setLessonDialogOpen(true);
  }

  async function handleDeleteLesson(lesson: EditorLesson) {
    if (!confirm(`Excluir a aula "${lesson.title}"? Ela sai de todos os cursos que usam este módulo.`)) return;
    report(await deleteLesson(lesson.id), "Aula excluída.");
  }

  async function handleMoveLesson(moduleId: string, lesson: EditorLesson, direction: "up" | "down") {
    report(await moveLesson(moduleId, lesson.id, direction));
  }

  async function handleToggleLessonStatus(lesson: EditorLesson) {
    report(await updateLessonStatus(lesson.id, lesson.status === "published" ? "draft" : "published"));
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-foreground-muted">
          {restricted ? `${modules.length} módulo${modules.length !== 1 ? "s" : ""} seu${modules.length !== 1 ? "s" : ""}` : `${modules.length} módulos`}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/preview/${courseId}`} className="flex-1 sm:flex-none">
            <Button size="sm" variant="ghost" className="w-full sm:w-auto" leftIcon={<Eye className="h-3.5 w-3.5" />}>Assistir (preview)</Button>
          </Link>
          {!restricted && (
            <>
              <Button size="sm" variant="outline" className="flex-1 sm:flex-none" onClick={openAttach} leftIcon={<Layers className="h-3.5 w-3.5" />}>Usar módulo existente</Button>
              <Button size="sm" variant="outline" className="flex-1 sm:flex-none" onClick={openCreateModule} leftIcon={<Plus className="h-3.5 w-3.5" />}>Novo módulo</Button>
            </>
          )}
        </div>
      </div>

      {modules.map((mod, mi) => (
        <div key={mod.id} className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="p-3">
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => toggle(mod.id)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors hover:bg-primary/20"
                aria-label={expanded.has(mod.id) ? "Recolher módulo" : "Expandir módulo"}
              >
                <ChevronRight className={`h-4 w-4 transition-transform duration-500 ${expanded.has(mod.id) ? "rotate-90" : ""}`} />
              </button>
              {mod.instructorName && mod.instructorAvatar ? (
                <img src={mod.instructorAvatar} alt={mod.instructorName} className="h-11 w-11 shrink-0 rounded-lg object-cover" />
              ) : mod.instructorName ? (
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#16233b] text-sm font-bold text-primary" title={mod.instructorName}>
                  {getInitials(mod.instructorName)}
                </div>
              ) : (
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#16233b] text-base font-extrabold text-primary">
                  {String(mi + 1).padStart(2, "0")}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground sm:text-base">{mod.title}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                  {mod.instructorName && <Badge variant="default">Prof. {mod.instructorName.split(" ")[0]}</Badge>}
                  <Badge variant={mod.isPublished ? "success" : "secondary"}>{mod.isPublished ? "Publicado" : "Rascunho"}</Badge>
                  <span className="text-xs text-foreground-muted">{mod.lessons.length} aulas</span>
                  {mod.usedIn.length > 0 && (
                    <span className="flex items-center gap-1 text-xs text-foreground-muted" title={`Editar as aulas altera também: ${mod.usedIn.join(", ")}`}>
                      <Link2 className="h-3 w-3" /> Também em: {mod.usedIn.join(", ")}
                    </span>
                  )}
                  {!mod.canEdit && <Badge variant="secondary">Só leitura</Badge>}
                  {!restricted && mod.lessons.length > 0 && (
                    <Button
                      size="xs"
                      variant={isModuleAllPublished(mod) ? "outline" : "default"}
                      onClick={() => handlePublishAll(mod, !isModuleAllPublished(mod))}
                      leftIcon={<Eye className="h-3 w-3" />}
                    >
                      {isModuleAllPublished(mod) ? "Despublicar tudo" : "Publicar tudo"}
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                {!restricted && (
                  <>
                    <Button variant="ghost" size="icon-sm" className="hidden sm:inline-flex" disabled={mi === 0} onClick={() => handleMoveModule(mod, "up")}><ArrowUp className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon-sm" className="hidden sm:inline-flex" disabled={mi === modules.length - 1} onClick={() => handleMoveModule(mod, "down")}><ArrowDown className="h-3.5 w-3.5" /></Button>
                  </>
                )}
                {!restricted && (
                  <Button variant="ghost" size="icon-sm" title={mod.isPublished ? "Despublicar neste curso" : "Publicar neste curso"} onClick={() => handleToggleModule(mod)}>{mod.isPublished ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}</Button>
                )}
                {mod.canEdit && (
                  <Button variant="ghost" size="icon-sm" title="Editar módulo" onClick={() => openRenameModule(mod)}><Pencil className="h-3.5 w-3.5" /></Button>
                )}
                {!restricted && (
                  <Button variant="ghost" size="icon-sm" title="Remover do curso" onClick={() => handleRemoveModule(mod)}><Unlink className="h-3.5 w-3.5 text-destructive" /></Button>
                )}
              </div>
            </div>
          </div>

          <div className={`grid transition-[grid-template-rows] duration-500 ease-out ${expanded.has(mod.id) ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
            <div className="overflow-hidden">
              <div className="divide-y divide-border border-t border-border">
              {mod.lessons.map((lesson, li) => (
                <div key={lesson.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/20">
                  {lesson.type === "video" && lesson.videoUrl ? (
                    <button
                      onClick={() => setPreviewLesson(lesson)}
                      title="Assistir prévia da aula"
                      className="group/vid relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary/10 text-primary transition-colors hover:bg-primary/20"
                    >
                      {typeIcons[lesson.type]}
                      <span className="absolute inset-0 flex items-center justify-center bg-primary/90 opacity-0 transition-opacity group-hover/vid:opacity-100">
                        <Play className="h-4 w-4 fill-white text-white" />
                      </span>
                    </button>
                  ) : (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      {typeIcons[lesson.type]}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="truncate text-sm text-foreground">{lesson.title}</span>
                      {lesson.isFree && <Badge variant="secondary">Grátis</Badge>}
                      <Badge variant={lesson.status === "published" ? "success" : "secondary"}>{lesson.status === "published" ? "Publicada" : "Rascunho"}</Badge>
                      {lesson.duration ? (
                        <span className="flex items-center gap-1 text-2xs text-foreground-muted sm:hidden"><Clock className="h-3 w-3" />{formatDuration(lesson.duration)}</span>
                      ) : null}
                    </div>
                  </div>
                  {lesson.duration ? (
                    <span className="hidden shrink-0 items-center gap-1 text-xs text-foreground-muted sm:flex"><Clock className="h-3 w-3" />{formatDuration(lesson.duration)}</span>
                  ) : null}
                  {mod.canEdit && (
                    <div className="flex shrink-0 items-center gap-0.5">
                      <Button variant="ghost" size="icon-sm" className="hidden sm:inline-flex" disabled={li === 0} onClick={() => handleMoveLesson(mod.id, lesson, "up")}><ArrowUp className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon-sm" className="hidden sm:inline-flex" disabled={li === mod.lessons.length - 1} onClick={() => handleMoveLesson(mod.id, lesson, "down")}><ArrowDown className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => handleToggleLessonStatus(lesson)}>{lesson.status === "published" ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}</Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => openEditLesson(mod.id, lesson)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => handleDeleteLesson(lesson)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                    </div>
                  )}
                </div>
              ))}
              {mod.canEdit ? (
                <div className="px-3 py-2.5">
                  <Button size="sm" variant="ghost" onClick={() => openCreateLesson(mod.id)} leftIcon={<Plus className="h-3.5 w-3.5" />}>Adicionar aula</Button>
                </div>
              ) : (
                <p className="px-3 py-2.5 text-xs text-foreground-muted">Só o professor responsável pelo módulo (ou o admin) edita estas aulas.</p>
              )}
              </div>
            </div>
          </div>
        </div>
      ))}

      {modules.length === 0 && (
        <div className="py-12 text-center text-sm text-foreground-muted border border-dashed border-border rounded-lg">
          Nenhum módulo ainda. Comece adicionando o primeiro.
        </div>
      )}

      <Dialog open={moduleDialogOpen} onClose={() => setModuleDialogOpen(false)} title={editingModule ? "Editar módulo" : "Novo módulo"}>
        <div className="space-y-4">
          <Input label="Título do módulo" placeholder="Ex: Direito Constitucional" value={newModuleTitle} onChange={(e) => setNewModuleTitle(e.target.value)} />
          {teachers.length > 0 && (
            <Select
              label="Professor responsável"
              hint="O professor escolhido é o dono do módulo: só ele (e o admin) edita as aulas."
              value={newModuleInstructor}
              onChange={(e) => setNewModuleInstructor(e.target.value)}
              options={[
                { value: "", label: "Sem professor específico" },
                ...teachers.map((t) => ({ value: t.id, label: t.name })),
              ]}
            />
          )}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Capa do módulo</label>
            <MediaUploader
              resourceType="image"
              folder="lms/module-covers"
              value={newModuleCover}
              onUploaded={(r) => setNewModuleCover(r.url)}
              onRemove={() => setNewModuleCover("")}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setModuleDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleSaveModule}>{editingModule ? "Salvar" : "Criar módulo"}</Button>
        </DialogFooter>
      </Dialog>

      {lessonModuleId && (
        <LessonFormDialog
          open={lessonDialogOpen}
          onClose={() => setLessonDialogOpen(false)}
          moduleId={lessonModuleId}
          initial={editingLesson}
        />
      )}

      {/* Prévia rápida do vídeo da aula (para o dono/admin conferir sem sair) */}
      <Dialog open={!!previewLesson} onClose={() => setPreviewLesson(null)} title={previewLesson?.title} size="full">
        {previewLesson?.previewUrl && (
          <VideoPlayer key={previewLesson.id} src={previewLesson.previewUrl} title={previewLesson.title} className="w-full" />
        )}
      </Dialog>

      {/* Reaproveitar um módulo já existente (de outro curso ou guardado) */}
      <Dialog open={attachOpen} onClose={() => setAttachOpen(false)} title="Usar módulo existente">
        <div className="space-y-3">
          <p className="text-sm text-foreground-muted">
            O módulo entra neste curso com as mesmas aulas e vídeos — nada é copiado nem reenviado. Alterações nas aulas valem para todos os cursos que usam o módulo.
          </p>
          <Input
            placeholder="Buscar pelo nome (ex: Constitucional)"
            value={attachSearch}
            onChange={(e) => { setAttachSearch(e.target.value); loadAttachable(e.target.value); }}
          />
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
    </div>
  );
}
