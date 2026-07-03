"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { MediaUploader } from "@/components/upload/media-uploader";
import { createCourse } from "@/lib/actions/courses";
import type { ProductLevel } from "@/lib/types";

const LEVEL_OPTIONS: { value: ProductLevel; label: string }[] = [
  { value: "beginner", label: "Iniciante" },
  { value: "intermediate", label: "Intermediário" },
  { value: "advanced", label: "Avançado" },
  { value: "all", label: "Todos os níveis" },
];

const EMPTY_FORM = {
  title: "",
  shortDescription: "",
  description: "",
  price: "",
  comparePrice: "",
  categoryName: "",
  level: "beginner" as ProductLevel,
  thumbnail: "",
};

export function CreateCourseDialog({ onCreated }: { onCreated?: (courseId: string) => void }) {
  const { success, error } = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  function close() {
    setOpen(false);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit() {
    if (!form.title || !form.shortDescription || !form.categoryName || !form.price) {
      error("Preencha título, descrição curta, categoria e preço.");
      return;
    }
    setLoading(true);
    try {
      const result = await createCourse({
        title: form.title,
        shortDescription: form.shortDescription,
        description: form.description || form.shortDescription,
        price: Number(form.price),
        comparePrice: form.comparePrice ? Number(form.comparePrice) : undefined,
        categoryName: form.categoryName,
        level: form.level,
        thumbnail: form.thumbnail,
      });
      success("Curso criado como rascunho.");
      close();
      router.refresh();
      onCreated?.(result.courseId);
    } catch {
      error("Erro ao criar curso. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>Novo curso</Button>
      <Dialog open={open} onClose={close} title="Novo curso" description="Crie o curso como rascunho e publique quando estiver pronto." size="lg">
        <div className="space-y-4">
          <Input label="Título" placeholder="Ex: GMF — Curso Completo" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          <Input label="Descrição curta" placeholder="Resumo de uma linha para os cards" value={form.shortDescription} onChange={(e) => setForm((f) => ({ ...f, shortDescription: e.target.value }))} />
          <Textarea label="Descrição completa" placeholder="Detalhes do curso (opcional, usa a curta se vazio)" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Preço (R$)" type="number" min="0" step="0.01" placeholder="297.00" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} />
            <Input label="De (opcional)" type="number" min="0" step="0.01" placeholder="397.00" value={form.comparePrice} onChange={(e) => setForm((f) => ({ ...f, comparePrice: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Categoria" placeholder="Ex: Concursos Municipais" value={form.categoryName} onChange={(e) => setForm((f) => ({ ...f, categoryName: e.target.value }))} />
            <Select
              label="Nível"
              options={LEVEL_OPTIONS}
              value={form.level}
              onChange={(e) => setForm((f) => ({ ...f, level: e.target.value as ProductLevel }))}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Capa do curso</label>
            <MediaUploader
              resourceType="image"
              folder="lms/thumbnails"
              value={form.thumbnail}
              onUploaded={(r) => setForm((f) => ({ ...f, thumbnail: r.url }))}
              onRemove={() => setForm((f) => ({ ...f, thumbnail: "" }))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={close}>Cancelar</Button>
          <Button onClick={handleSubmit} loading={loading}>Criar curso</Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
