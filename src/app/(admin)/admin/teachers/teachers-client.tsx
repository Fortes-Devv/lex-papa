"use client";
import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CdnImg } from "@/components/ui/cdn-img";
import { ActionButton } from "@/components/admin/action-button";
import { deleteTeacher } from "@/lib/actions/teachers";
import { TeacherDialog, type TeacherDraft } from "./teacher-dialog";

interface TeacherRow { id: string; name: string; bio: string; avatar: string; modules: string[] }

const initials = (name: string) => name.split(/\s+/).filter(Boolean).map((p) => p[0]).slice(0, 2).join("").toUpperCase();

export function TeachersClient({ teachers }: { teachers: TeacherRow[] }) {
  const [draft, setDraft] = useState<TeacherDraft | null>(null);

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setDraft({ name: "", bio: "", avatar: "" })} leftIcon={<Plus className="h-4 w-4" />}>Novo professor</Button>
      </div>
      {teachers.length === 0 ? (
        <div className="rounded-[14px] border border-dashed border-border p-10 text-center text-sm text-foreground-muted">
          Nenhum professor cadastrado. Cadastre e depois escolha o professor em “Editar módulo”.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {teachers.map((t) => (
            <div key={t.id} className="flex flex-col rounded-[14px] border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-navy text-sm font-extrabold text-brand">
                  {t.avatar ? <CdnImg src={t.avatar} width={96} aspect="1:1" alt="" className="h-full w-full object-cover" /> : initials(t.name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-bold text-foreground">{t.name}</span>
                  <span className="block text-xs text-foreground-muted">{t.modules.length} módulo{t.modules.length !== 1 ? "s" : ""}</span>
                </span>
              </div>
              {t.bio && <p className="mt-3 line-clamp-2 text-[13px] text-foreground-muted">{t.bio}</p>}
              {t.modules.length > 0 && (
                <p className="mt-2 line-clamp-2 text-xs text-foreground-muted"><b className="text-foreground">Módulos:</b> {t.modules.join(", ")}</p>
              )}
              <div className="mt-auto flex gap-2 pt-4">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => setDraft({ id: t.id, name: t.name, bio: t.bio, avatar: t.avatar })} leftIcon={<Pencil className="h-3.5 w-3.5" />}>Editar</Button>
                <ActionButton variant="ghost" className="h-9 text-danger" action={deleteTeacher.bind(null, t.id)}
                  confirmText={`Excluir ${t.name}?${t.modules.length ? ` Os ${t.modules.length} módulo(s) dele ficam sem professor (as aulas não mudam).` : ""}`}>
                  <Trash2 className="h-3.5 w-3.5" /> Excluir
                </ActionButton>
              </div>
            </div>
          ))}
        </div>
      )}
      <TeacherDialog draft={draft} onClose={() => setDraft(null)} />
    </>
  );
}
