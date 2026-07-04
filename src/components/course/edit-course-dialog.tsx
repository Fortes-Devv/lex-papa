"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { MediaUploader } from "@/components/upload/media-uploader";
import { updateCourseDetails } from "@/lib/actions/courses";
import { parseBRL } from "@/lib/utils/cn";
import type { ProductLevel } from "@/lib/types";

const LEVEL_OPTIONS: { value: ProductLevel; label: string }[] = [
  { value: "beginner", label: "Iniciante" },
  { value: "intermediate", label: "Intermediário" },
  { value: "advanced", label: "Avançado" },
  { value: "all", label: "Todos os níveis" },
];

export interface EditCourseInitial {
  productId: string;
  title: string;
  shortDescription: string;
  description: string;
  price: number;
  comparePrice?: number;
  categoryName: string;
  level: ProductLevel;
  thumbnail: string;
}

const fmtNum = (n?: number) => (n && n > 0 ? String(n).replace(".", ",") : "");

export function EditCourseDialog({ initial }: { initial: EditCourseInitial }) {
  const { success, error } = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: initial.title,
    shortDescription: initial.shortDescription,
    description: initial.description,
    price: fmtNum(initial.price),
    comparePrice: fmtNum(initial.comparePrice),
    categoryName: initial.categoryName,
    level: initial.level,
    thumbnail: initial.thumbnail,
  });

  async function handleSubmit() {
    if (!form.title || !form.shortDescription || !form.categoryName || !form.price) {
      error("Preencha título, descrição curta, categoria e preço.");
      return;
    }
    setLoading(true);
    try {
      const result = await updateCourseDetails(initial.productId, {
        title: form.title,
        shortDescription: form.shortDescription,
        description: form.description || form.shortDescription,
        price: parseBRL(form.price),
        comparePrice: form.comparePrice ? parseBRL(form.comparePrice) : undefined,
        categoryName: form.categoryName,
        level: form.level,
        thumbnail: form.thumbnail,
      });
      if (!result.success) { error(result.error); return; }
      success("Curso atualizado.");
      setOpen(false);
      router.refresh();
    } catch {
      error("Erro ao salvar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} leftIcon={<Pencil className="h-3.5 w-3.5" />}>Editar</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Editar curso" description="Atualize preço, título, descrição e capa." size="lg">
        <div className="space-y-4">
          <Input label="Título" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          <Input label="Descrição curta" value={form.shortDescription} onChange={(e) => setForm((f) => ({ ...f, shortDescription: e.target.value }))} />
          <Textarea label="Descrição completa" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Preço (R$)" inputMode="decimal" placeholder="297,00" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} />
            <Input label="De (opcional)" inputMode="decimal" placeholder="397,00" value={form.comparePrice} onChange={(e) => setForm((f) => ({ ...f, comparePrice: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Categoria" value={form.categoryName} onChange={(e) => setForm((f) => ({ ...f, categoryName: e.target.value }))} />
            <Select label="Nível" options={LEVEL_OPTIONS} value={form.level} onChange={(e) => setForm((f) => ({ ...f, level: e.target.value as ProductLevel }))} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Capa do curso</label>
            <MediaUploader resourceType="image" folder="lms/thumbnails" value={form.thumbnail} onUploaded={(r) => setForm((f) => ({ ...f, thumbnail: r.url }))} onRemove={() => setForm((f) => ({ ...f, thumbnail: "" }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} loading={loading}>Salvar</Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
