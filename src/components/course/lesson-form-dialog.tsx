"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { BunnyVideoUploader } from "@/components/upload/bunny-video-uploader";
import { createLesson, updateLesson } from "@/lib/actions/courses";
import type { LessonType, Lesson } from "@/lib/types";

type CompletionCriteria = Lesson["completionCriteria"];

const TYPE_OPTIONS: { value: LessonType; label: string }[] = [
  { value: "video", label: "Vídeo" },
  { value: "text", label: "Texto" },
  { value: "pdf", label: "PDF" },
  { value: "audio", label: "Áudio" },
  { value: "download", label: "Download" },
  { value: "quiz", label: "Quiz" },
  { value: "exercise", label: "Exercício" },
];

const COMPLETION_OPTIONS = [
  { value: "watch_100", label: "Assistir 100%" },
  { value: "watch_80", label: "Assistir 80%" },
  { value: "complete_quiz", label: "Completar quiz" },
  { value: "manual", label: "Marcar manualmente" },
];

export interface LessonFormValue {
  id?: string;
  title: string;
  type: LessonType;
  description: string;
  videoUrl: string;
  videoPublicId: string;
  duration: string;
  isFree: boolean;
  isPreview: boolean;
  completionCriteria: string;
}

const EMPTY: LessonFormValue = {
  title: "", type: "video", description: "", videoUrl: "", videoPublicId: "",
  duration: "", isFree: false, isPreview: false, completionCriteria: "watch_100",
};

interface LessonFormDialogProps {
  open: boolean;
  onClose: () => void;
  moduleId: string;
  initial?: LessonFormValue | null;
}

export function LessonFormDialog({ open, onClose, moduleId, initial }: LessonFormDialogProps) {
  const { success, error } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<LessonFormValue>(initial ?? EMPTY);

  useEffect(() => {
    if (open) setForm(initial ?? EMPTY);
  }, [open, initial]);

  async function handleSubmit() {
    if (!form.title) {
      error("Dê um título para a aula.");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        title: form.title,
        type: form.type,
        description: form.description || undefined,
        videoUrl: form.videoUrl || undefined,
        videoProvider: (form.videoPublicId ? "bunny" : undefined) as "bunny" | undefined,
        videoPublicId: form.videoPublicId || undefined,
        duration: form.duration ? Number(form.duration) : undefined,
        isFree: form.isFree,
        isPreview: form.isPreview,
        completionCriteria: form.completionCriteria as CompletionCriteria,
      };
      if (form.id) {
        await updateLesson(form.id, payload);
        success("Aula atualizada.");
      } else {
        await createLesson(moduleId, payload);
        success("Aula criada.");
      }
      router.refresh();
      onClose();
    } catch {
      error("Erro ao salvar aula.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={form.id ? "Editar aula" : "Nova aula"} size="lg">
      <div className="space-y-4">
        <Input label="Título" placeholder="Ex: Introdução ao Direito Constitucional" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
        <Select
          label="Tipo"
          options={TYPE_OPTIONS}
          value={form.type}
          onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as LessonType }))}
        />
        <Textarea label="Descrição" placeholder="Do que se trata essa aula (opcional)" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />

        {form.type === "video" && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Vídeo</label>
            <BunnyVideoUploader
              value={form.videoPublicId}
              onUploaded={(r) => setForm((f) => ({
                ...f,
                videoUrl: r.playbackUrl,
                videoPublicId: r.videoId,
                // preenche a duração automaticamente (mantém o valor atual se não detectou)
                duration: r.duration != null ? String(r.duration) : f.duration,
              }))}
              onRemove={() => setForm((f) => ({ ...f, videoUrl: "", videoPublicId: "" }))}
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Input label="Duração (segundos)" type="number" min="0" placeholder="preenchido ao enviar o vídeo" value={form.duration} onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))} />
          <Select
            label="Critério de conclusão"
            options={COMPLETION_OPTIONS}
            value={form.completionCriteria}
            onChange={(e) => setForm((f) => ({ ...f, completionCriteria: e.target.value }))}
          />
        </div>

        <div className="flex items-center gap-6 text-sm">
          <label className="flex items-center gap-2 cursor-pointer text-foreground-muted">
            <input type="checkbox" className="rounded border-border" checked={form.isFree} onChange={(e) => setForm((f) => ({ ...f, isFree: e.target.checked }))} />
            Aula gratuita
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-foreground-muted">
            <input type="checkbox" className="rounded border-border" checked={form.isPreview} onChange={(e) => setForm((f) => ({ ...f, isPreview: e.target.checked }))} />
            Preview público
          </label>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSubmit} loading={loading}>{form.id ? "Salvar" : "Criar aula"}</Button>
      </DialogFooter>
    </Dialog>
  );
}
