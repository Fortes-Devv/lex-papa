"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, ChevronDown, ChevronRight, ArrowUp, ArrowDown, Trash2, Pencil,
  Video, FileText, HelpCircle, Download, Music, Dumbbell, Eye, EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { formatDuration } from "@/lib/utils/cn";
import {
  createModule, renameModule, deleteModule, moveModule, toggleModulePublished,
  deleteLesson, moveLesson, updateLessonStatus,
} from "@/lib/actions/courses";
import { LessonFormDialog, type LessonFormValue } from "./lesson-form-dialog";
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
  const [editingModule, setEditingModule] = useState<EditorModule | null>(null);

  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [lessonModuleId, setLessonModuleId] = useState<string | null>(null);
  const [editingLesson, setEditingLesson] = useState<LessonFormValue | null>(null);

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
    setModuleDialogOpen(true);
  }

  function openRenameModule(mod: EditorModule) {
    setEditingModule(mod);
    setNewModuleTitle(mod.title);
    setNewModuleInstructor(mod.instructorId ?? "");
    setModuleDialogOpen(true);
  }

  async function handleSaveModule() {
    if (!newModuleTitle) { error("Dê um título para o módulo."); return; }
    const instructorId = newModuleInstructor || null;
    if (editingModule) {
      await renameModule(editingModule.id, newModuleTitle, instructorId);
      success("Módulo atualizado.");
    } else {
      await createModule(courseId, newModuleTitle, instructorId);
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
      <div className="flex items-center justify-between">
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
        <div key={mod.id} className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2.5 bg-muted/30">
            <button onClick={() => toggle(mod.id)} className="text-foreground-muted shrink-0">
              {expanded.has(mod.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
            <span className="flex-1 text-sm font-medium text-foreground truncate">{mod.title}</span>
            {mod.instructorName && (
              <Badge variant="default" className="shrink-0">Prof. {mod.instructorName.split(" ")[0]}</Badge>
            )}
            <Badge variant={mod.isPublished ? "success" : "secondary"} className="shrink-0">
              {mod.isPublished ? "Publicado" : "Rascunho"}
            </Badge>
            <span className="text-xs text-foreground-muted shrink-0">{mod.lessons.length} aulas</span>
            <div className="flex items-center gap-0.5 shrink-0">
              {!restricted && (
                <>
                  <Button variant="ghost" size="icon-sm" disabled={mi === 0} onClick={() => handleMoveModule(mod, "up")}><ArrowUp className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon-sm" disabled={mi === modules.length - 1} onClick={() => handleMoveModule(mod, "down")}><ArrowDown className="h-3.5 w-3.5" /></Button>
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

          {expanded.has(mod.id) && (
            <div className="divide-y divide-border">
              {mod.lessons.map((lesson, li) => (
                <div key={lesson.id} className="flex items-center gap-2 px-3 py-2 pl-9 hover:bg-muted/20">
                  <span className="text-foreground-muted shrink-0">{typeIcons[lesson.type]}</span>
                  <span className="flex-1 text-sm text-foreground truncate">{lesson.title}</span>
                  {lesson.isFree && <Badge variant="secondary" className="shrink-0">Grátis</Badge>}
                  <Badge variant={lesson.status === "published" ? "success" : "secondary"} className="shrink-0">
                    {lesson.status === "published" ? "Publicada" : "Rascunho"}
                  </Badge>
                  {lesson.duration ? <span className="text-xs text-foreground-muted shrink-0">{formatDuration(lesson.duration)}</span> : null}
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Button variant="ghost" size="icon-sm" disabled={li === 0} onClick={() => handleMoveLesson(mod.id, lesson, "up")}><ArrowUp className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon-sm" disabled={li === mod.lessons.length - 1} onClick={() => handleMoveLesson(mod.id, lesson, "down")}><ArrowDown className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => handleToggleLessonStatus(lesson)}>{lesson.status === "published" ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}</Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => openEditLesson(mod.id, lesson)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => handleDeleteLesson(lesson)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                </div>
              ))}
              <div className="px-3 py-2 pl-9">
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
    </div>
  );
}
