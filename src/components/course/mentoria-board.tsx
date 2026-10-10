"use client";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Eye, EyeOff, HardDrive, Lock, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DropdownItem } from "@/components/ui/dropdown";
import { useToast } from "@/components/ui/toast";
import { LessonFormDialog, type LessonFormValue } from "@/components/course/lesson-form-dialog";
import { DriveImportDialog } from "@/components/course/drive-import-dialog";
import { PreviewPanel } from "@/components/course/module-board/preview-panel";
import type { EditorLesson, EditorModule } from "@/components/course/module-board/types";
import { defaultLesson } from "@/components/course/module-board/utils";
import { deleteLesson, moveLesson, publishAllLessons, updateLessonStatus } from "@/lib/actions/courses";
import { MENTORIA_RELEASE_DAYS } from "@/lib/release";

type ActionResult = { success: boolean; error?: string };

// Mentoria no admin: sem módulos, só a lista de aulas (adicionar, Drive, publicar, ordenar).
export function MentoriaBoard({ mod }: { mod: EditorModule }) {
  const router = useRouter();
  const { success, error } = useToast();
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [drive, setDrive] = useState(false);
  const [lessonDialog, setLessonDialog] = useState<{ open: boolean; initial: LessonFormValue | null }>({ open: false, initial: null });
  const lesson = mod.lessons.find((l) => l.id === lessonId) ?? defaultLesson(mod);

  const report = useCallback((result: ActionResult, ok?: string) => {
    if (!result.success) { error(result.error ?? "Não foi possível concluir."); return false; }
    if (ok) success(ok);
    router.refresh();
    return true;
  }, [error, success, router]);

  const lessonMenu = (l: EditorLesson, i: number): DropdownItem[] => [
    {
      label: "Editar aula", icon: <Pencil className="h-3.5 w-3.5" />, onClick: () => setLessonDialog({
        open: true, initial: {
          id: l.id, title: l.title, type: l.type, description: l.description ?? "", videoUrl: l.videoUrl ?? "",
          videoPublicId: l.videoPublicId ?? "", pdfUrl: l.pdfUrl ?? "", duration: l.duration ? String(l.duration) : "",
          isFree: l.isFree, isPreview: l.isPreview, completionCriteria: l.completionCriteria, dripDays: String(l.dripDays ?? 0),
          materials: l.materials,
        },
      }),
    },
    { label: l.status === "published" ? "Ocultar do aluno" : "Publicar aula", icon: l.status === "published" ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />, onClick: async () => report(await updateLessonStatus(l.id, l.status === "published" ? "draft" : "published")) },
    { label: "Mover para cima", icon: <ArrowUp className="h-3.5 w-3.5" />, disabled: i === 0, onClick: async () => report(await moveLesson(mod.id, l.id, "up")) },
    { label: "Mover para baixo", icon: <ArrowDown className="h-3.5 w-3.5" />, disabled: i === mod.lessons.length - 1, onClick: async () => report(await moveLesson(mod.id, l.id, "down")) },
    { separator: true },
    {
      label: "Excluir aula", icon: <Trash2 className="h-3.5 w-3.5" />, variant: "destructive", onClick: async () => {
        if (!confirm(`Excluir a aula "${l.title}"?`)) return;
        report(await deleteLesson(l.id), "Aula excluída.");
      },
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="inline-flex flex-1 items-center gap-1.5 text-sm text-foreground-muted">
          <Lock className="h-4 w-4 text-brand" /> O aluno só acessa a Mentoria {MENTORIA_RELEASE_DAYS} dias após a compra.
        </p>
        <Button size="sm" variant="outline" leftIcon={<HardDrive className="h-3.5 w-3.5" />} onClick={() => setDrive(true)}>Importar do Google Drive</Button>
        <Button size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => setLessonDialog({ open: true, initial: null })}>Adicionar aula</Button>
      </div>

      <PreviewPanel
        mod={mod}
        lesson={lesson}
        playing={playing}
        onPlay={() => setPlaying(true)}
        onSelectLesson={(l) => { setLessonId(l.id); setPlaying(false); }}
        onAddLesson={() => setLessonDialog({ open: true, initial: null })}
        onImportDrive={() => setDrive(true)}
        onPublishAll={async () => report(await publishAllLessons(mod.id), "Aulas publicadas.")}
        lessonMenu={lessonMenu}
      />

      <LessonFormDialog
        open={lessonDialog.open}
        onClose={() => setLessonDialog((d) => ({ ...d, open: false }))}
        moduleId={mod.id}
        initial={lessonDialog.initial}
      />
      {drive && <DriveImportDialog open onClose={() => setDrive(false)} moduleId={mod.id} moduleTitle="Mentoria" />}
    </div>
  );
}
