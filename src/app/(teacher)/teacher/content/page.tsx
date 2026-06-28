"use client";
import { useState } from "react";
import { Plus, Video, FileText, HelpCircle, Download, Music, Dumbbell, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { MOCK_MODULES } from "@/lib/mock/data";
import { formatDuration } from "@/lib/utils/cn";
import { cn } from "@/lib/utils/cn";

const typeIcons: Record<string, React.ReactNode> = {
  video: <Video className="h-3.5 w-3.5" />,
  text: <FileText className="h-3.5 w-3.5" />,
  quiz: <HelpCircle className="h-3.5 w-3.5" />,
  pdf: <FileText className="h-3.5 w-3.5" />,
  download: <Download className="h-3.5 w-3.5" />,
  audio: <Music className="h-3.5 w-3.5" />,
  exercise: <Dumbbell className="h-3.5 w-3.5" />,
};

export default function TeacherContentPage() {
  const { success } = useToast();
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Editor de Conteúdo</h1>
          <p className="text-sm text-foreground-muted mt-0.5">Organize módulos e aulas dos seus cursos</p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => success("Novo módulo criado!")}>Novo módulo</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Modules list */}
        <div className="space-y-3">
          {MOCK_MODULES.map((mod) => (
            <div key={mod.id} className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-muted/20">
                <GripVertical className="h-4 w-4 text-foreground-subtle cursor-grab" />
                <span className="flex-1 font-semibold text-sm text-foreground">{mod.title}</span>
                <span className="text-xs text-foreground-muted">{mod.lessons.length} aulas</span>
                <Button size="xs" variant="ghost">Editar</Button>
              </div>
              <div className="divide-y divide-border">
                {mod.lessons.map((lesson) => (
                  <button
                    key={lesson.id}
                    onClick={() => setSelected(lesson.id)}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors text-left",
                      selected === lesson.id && "bg-primary/5 border-l-2 border-primary"
                    )}
                  >
                    <GripVertical className="h-3.5 w-3.5 text-foreground-subtle cursor-grab shrink-0" />
                    <span className="text-foreground-muted shrink-0">{typeIcons[lesson.type]}</span>
                    <span className="flex-1 text-sm text-foreground truncate">{lesson.title}</span>
                    {lesson.duration && <span className="text-xs text-foreground-muted shrink-0">{formatDuration(lesson.duration)}</span>}
                    <Badge variant={lesson.status === "published" ? "success" : "secondary"} className="shrink-0">{lesson.status === "published" ? "Pub." : "Rasc."}</Badge>
                  </button>
                ))}
                <div className="px-4 py-2">
                  <Button variant="ghost" size="xs" leftIcon={<Plus className="h-3 w-3" />} onClick={() => success("Aula adicionada!")}>Adicionar aula</Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Lesson editor */}
        <div className="rounded-lg border border-border bg-card p-5">
          {selected ? (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-foreground">Editar aula</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-foreground-muted">Título</label>
                  <input className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" defaultValue={MOCK_MODULES.flatMap((m) => m.lessons).find((l) => l.id === selected)?.title} />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground-muted">Tipo</label>
                  <select className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    {["video","text","quiz","pdf","audio","download","exercise"].map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground-muted">URL do vídeo</label>
                  <input className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="https://..." />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground-muted">Descrição</label>
                  <textarea className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px] resize-none" placeholder="Descreva o conteúdo..." />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" onClick={() => success("Aula salva!")}>Salvar</Button>
                  <Button size="sm" variant="outline" onClick={() => success("Publicado!")}>Publicar</Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <FileText className="h-8 w-8 text-foreground-subtle mb-3" />
              <p className="text-sm font-medium text-foreground">Selecione uma aula</p>
              <p className="text-xs text-foreground-muted mt-1">Clique em uma aula para editar seu conteúdo.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
