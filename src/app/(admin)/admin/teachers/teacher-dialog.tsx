"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { MediaUploader } from "@/components/upload/media-uploader";
import { createTeacher, updateTeacher } from "@/lib/actions/teachers";

export interface TeacherDraft { id?: string; name: string; bio: string; avatar: string }

// Professor só para créditos: nome, foto e minibio. Não tem login nem acesso.
export function TeacherDialog({ draft, onClose }: { draft: TeacherDraft | null; onClose: () => void }) {
  const { success, error } = useToast();
  const router = useRouter();
  const [form, setForm] = useState<TeacherDraft>({ name: "", bio: "", avatar: "" });
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (draft) setForm(draft); }, [draft]);

  async function save() {
    setSaving(true);
    const input = { name: form.name, bio: form.bio, avatar: form.avatar };
    const res = form.id ? await updateTeacher(form.id, input) : await createTeacher(input);
    setSaving(false);
    if (!res.success) { error(res.error); return; }
    success(form.id ? "Professor atualizado." : `Professor ${form.name} cadastrado. Associe-o aos módulos em “Editar módulo”.`);
    onClose();
    router.refresh();
  }

  return (
    <Dialog open={!!draft} onClose={onClose} title={form.id ? "Editar professor" : "Novo professor"}
      description="Só para dar os créditos: o nome aparece nos módulos e na página do curso. Professor não é usuário: não tem login nem acesso à plataforma.">
      <div className="space-y-4">
        <Input label="Nome" placeholder="Ex.: Riccardo Carvalho" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} autoFocus />
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Foto (opcional)</label>
          <MediaUploader resourceType="image" folder="lms/avatars" value={form.avatar || undefined} onUploaded={(r) => setForm((f) => ({ ...f, avatar: r.url }))} onRemove={() => setForm((f) => ({ ...f, avatar: "" }))} />
        </div>
        <Textarea label="Minibio (opcional)" placeholder="Ex.: Delegado, professor de Direito Penal há 10 anos." value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={save} loading={saving} disabled={form.name.trim().length < 2}>{form.id ? "Salvar" : "Cadastrar professor"}</Button>
      </DialogFooter>
    </Dialog>
  );
}
