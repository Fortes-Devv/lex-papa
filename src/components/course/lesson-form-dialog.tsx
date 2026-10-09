"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { BunnyVideoUploader } from "@/components/upload/bunny-video-uploader";
import { MediaUploader } from "@/components/upload/media-uploader";
import { QuizBuilder } from "@/components/course/quiz-builder";
import { createLesson, updateLesson } from "@/lib/actions/courses";
import type { LessonType, Lesson } from "@/lib/types";
import { LessonMaterials, type MaterialItem } from "@/components/course/lesson-materials";
import { addLessonMaterial } from "@/lib/actions/materials";

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
  pdfUrl: string;
  duration: string;
  isFree: boolean;
  isPreview: boolean;
  completionCriteria: string;
  dripDays?: string;
  materials?: MaterialItem[]; // PDFs anexados à aula
}

const EMPTY: LessonFormValue = {
  title: "", type: "video", description: "", videoUrl: "", videoPublicId: "", pdfUrl: "",
  duration: "", isFree: false, isPreview: false, completionCriteria: "watch_100", dripDays: "0", materials: [],
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
      const base = {
        title: form.title,
        type: form.type,
        description: form.description || undefined,
        isFree: form.isFree,
        isPreview: form.isPreview,
        completionCriteria: form.completionCriteria as CompletionCriteria,
        dripDays: Number(form.dripDays ?? 0) || 0,
      };
      if (form.id) {
        // null limpa de verdade (ex: ao remover o vídeo/PDF)
        const result = await updateLesson(form.id, {
          ...base,
          videoUrl: form.videoUrl || null,
          videoProvider: form.videoPublicId ? "bunny" : null,
          videoPublicId: form.videoPublicId || null,
          pdfUrl: form.pdfUrl || null,
          duration: form.duration ? Number(form.duration) : null,
        });
        if (!result.success) { error(result.error); return; }
        success("Aula atualizada.");
      } else {
        const result = await createLesson(moduleId, {
          ...base,
          videoUrl: form.videoUrl || undefined,
          videoProvider: (form.videoPublicId ? "bunny" : undefined) as "bunny" | undefined,
          videoPublicId: form.videoPublicId || undefined,
          pdfUrl: form.pdfUrl || undefined,
          duration: form.duration ? Number(form.duration) : undefined,
        });
        if (!result.success) { error(result.error); return; }
        // PDFs escolhidos antes de a aula existir: anexa agora.
        for (const m of form.materials ?? []) {
          if (!m.id && m.url) {
            const added = await addLessonMaterial(result.lessonId, { title: m.title, url: m.url });
            if (!added.success) error(`Não foi possível anexar "${m.title}": ${added.error}`);
          }
        }
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

        {(form.type === "video" || form.videoPublicId) && (
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

        {(form.type === "pdf" || form.pdfUrl) && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">PDF da aula</label>
            <MediaUploader
              resourceType="raw"
              folder="lms/pdfs"
              value={form.pdfUrl}
              onUploaded={(r) => setForm((f) => ({ ...f, pdfUrl: r.url }))}
              onRemove={() => setForm((f) => ({ ...f, pdfUrl: "" }))}
            />
          </div>
        )}

        {form.type !== "pdf" && (
          <LessonMaterials
            lessonId={form.id}
            items={form.materials ?? []}
            onChange={(materials) => { setForm((f) => ({ ...f, materials })); if (form.id) router.refresh(); }}
          />
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

        <div>
          <Input label="Liberar após (dias da compra)" type="number" min="0" max="365" value={form.dripDays ?? "0"} onChange={(e) => setForm((f) => ({ ...f, dripDays: e.target.value }))} />
          <p className="mt-1 text-xs text-foreground-muted">0 = liberada na hora. Ex.: 7 = o aluno só assiste e baixa o PDF desta aula 7 dias depois da compra.</p>
        </div>

        {/* Quiz opcional — funciona em qualquer tipo de aula, sem trocar o tipo */}
        {form.id ? (
          <QuizBuilder lessonId={form.id} />
        ) : (
          <p className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-center text-xs text-foreground-muted">
            Quer um quiz nesta aula? <strong className="text-foreground">Crie a aula primeiro</strong> e depois abra em Editar.
          </p>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSubmit} loading={loading}>{form.id ? "Salvar" : "Criar aula"}</Button>
      </DialogFooter>
    </Dialog>
  );
}
