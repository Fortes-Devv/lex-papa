"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, ChevronDown, ChevronRight, ArrowUp, ArrowDown, Trash2, Pencil,
  Video, FileText, HelpCircle, Download, Music, Dumbbell, Eye, EyeOff, Clock, Play,
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
  deleteLesson, moveLesson, updateLessonStatus,
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
  videoPublicId: string | null;
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
    if (editingModule) {
      await renameModule(editingModule.id, newModuleTitle, instructorId, cover);
      success("Módulo atualizado.");
    } else {
      await createModule(courseId, newModuleTitle, instructorId, cover);
      success("Módulo criado.");
    }
    setModuleDialogOpen(false);
    router.refresh();
  }

  async function handleDeleteModule(mod: EditorModule) {
    if (!confirm(`Excluir o módulo "${mod.title}" e todas as suas aulas?`)) return;
    await deleteModule(mod.id);
    success("Módulo excluído.");
    router.refresh();
  }

  async function handleMoveModule(mod: EditorModule, direction: "up" | "down") {
    await moveModule(courseId, mod.id, direction);
    router.refresh();
  }

  async function handleToggleModule(mod: EditorModule) {
    await toggleModulePublished(mod.id, !mod.isPublished);
    router.refresh();
  }

  const isModuleAllPublished = (m: EditorModule) =>
    m.isPublished && m.lessons.length > 0 && m.lessons.every((l) => l.status === "published");

  async function handlePublishAll(mod: EditorModule, publish: boolean) {
    await setModulePublished(mod.id, publish);
    success(publish ? "Módulo e aulas publicados." : "Módulo e aulas despublicados.");
    router.refresh();
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
      duration: lesson.duration ? String(lesson.duration) : "",
      isFree: lesson.isFree,
      isPreview: lesson.isPreview,
      completionCriteria: lesson.completionCriteria,
    });
    setLessonDialogOpen(true);
  }

  async function handleDeleteLesson(lesson: EditorLesson) {
    if (!confirm(`Excluir a aula "${lesson.title}"?`)) return;
    await deleteLesson(lesson.id);
    success("Aula excluída.");
    router.refresh();
  }

  async function handleMoveLesson(moduleId: string, lesson: EditorLesson, direction: "up" | "down") {
    await moveLesson(moduleId, lesson.id, direction);
    router.refresh();
  }

  async function handleToggleLessonStatus(lesson: EditorLesson) {
    await updateLessonStatus(lesson.id, lesson.status === "published" ? "draft" : "published");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-foreground-muted">
          {restricted ? `${modules.length} módulo${modules.length !== 1 ? "s" : ""} seu${modules.length !== 1 ? "s" : ""}` : `${modules.length} módulos`}
        </p>
        <div className="flex items-center gap-2">
          <a href={`/preview/${courseId}`} target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="ghost" leftIcon={<Eye className="h-3.5 w-3.5" />}>Assistir (preview)</Button>
          </a>
          {!restricted && (
            <Button size="sm" variant="outline" onClick={openCreateModule} leftIcon={<Plus className="h-3.5 w-3.5" />}>Adicionar módulo</Button>
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
                {expanded.has(mod.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
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
                  {mod.lessons.length > 0 && (
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
                <Button variant="ghost" size="icon-sm" onClick={() => handleToggleModule(mod)}>{mod.isPublished ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}</Button>
                {!restricted && (
                  <>
                    <Button variant="ghost" size="icon-sm" onClick={() => openRenameModule(mod)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => handleDeleteModule(mod)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </>
                )}
              </div>
            </div>
          </div>

          {expanded.has(mod.id) && (
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
                  <div className="flex shrink-0 items-center gap-0.5">
                    <Button variant="ghost" size="icon-sm" className="hidden sm:inline-flex" disabled={li === 0} onClick={() => handleMoveLesson(mod.id, lesson, "up")}><ArrowUp className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon-sm" className="hidden sm:inline-flex" disabled={li === mod.lessons.length - 1} onClick={() => handleMoveLesson(mod.id, lesson, "down")}><ArrowDown className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => handleToggleLessonStatus(lesson)}>{lesson.status === "published" ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}</Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => openEditLesson(mod.id, lesson)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => handleDeleteLesson(lesson)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                </div>
              ))}
              <div className="px-3 py-2.5">
                <Button size="sm" variant="ghost" onClick={() => openCreateLesson(mod.id)} leftIcon={<Plus className="h-3.5 w-3.5" />}>Adicionar aula</Button>
              </div>
            </div>
          )}
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
          <Select
            label="Professor responsável"
            hint="O professor escolhido verá este módulo na área dele."
            value={newModuleInstructor}
            onChange={(e) => setNewModuleInstructor(e.target.value)}
            options={[
              { value: "", label: "Sem professor específico" },
              ...teachers.map((t) => ({ value: t.id, label: t.name })),
            ]}
          />
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
        {previewLesson?.videoUrl && (
          <VideoPlayer key={previewLesson.id} src={previewLesson.videoUrl} title={previewLesson.title} className="w-full" />
        )}
      </Dialog>
    </div>
  );
}
