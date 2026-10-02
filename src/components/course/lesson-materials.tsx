"use client";
import { useRef, useState } from "react";
import { FileText, Upload, Library, X, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { uploadToCloudinary } from "@/lib/cloudinary-upload";
import { addLessonMaterial, removeLessonMaterial, listReusablePdfs } from "@/lib/actions/materials";

export interface MaterialItem {
  id?: string; // sem id = ainda não salvo (aula nova)
  title: string;
  url?: string; // só para os pendentes (aula nova)
}

const PDF_MAX_BYTES = 50 * 1024 * 1024;
const titleFromFile = (name: string) => name.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ").trim();

// PDFs anexados à aula (o aluno baixa embaixo do vídeo).
// Com `lessonId`: salva na hora. Sem (aula nova): guarda pendentes, salvos ao criar a aula.
export function LessonMaterials({ lessonId, items, onChange }: { lessonId?: string; items: MaterialItem[]; onChange: (items: MaterialItem[]) => void }) {
  const { success, error } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [reusable, setReusable] = useState<Awaited<ReturnType<typeof listReusablePdfs>>>([]);
  const [loadingList, setLoadingList] = useState(false);

  async function attach(title: string, url: string) {
    if (!lessonId) { onChange([...items, { title, url }]); return; }
    const result = await addLessonMaterial(lessonId, { title, url });
    if (!result.success) { error(result.error); return; }
    onChange([...items, { id: result.material.id, title: result.material.title }]);
    success("PDF anexado à aula.");
  }

  async function handleFile(file: File) {
    if (file.type !== "application/pdf") { error("Envie um arquivo PDF."); return; }
    if (file.size > PDF_MAX_BYTES) { error("O PDF pode ter no máximo 50 MB."); return; }
    setProgress(0);
    try {
      const { url } = await uploadToCloudinary(file, { resourceType: "raw", folder: "lms/pdfs", onProgress: setProgress });
      await attach(titleFromFile(file.name) || "Material", url);
    } catch (err) {
      error(err instanceof Error ? err.message : "Não foi possível enviar o PDF.");
    } finally {
      setProgress(null);
    }
  }

  async function remove(index: number) {
    const item = items[index];
    if (item.id) {
      const result = await removeLessonMaterial(item.id);
      if (!result.success) { error(result.error); return; }
    }
    onChange(items.filter((_, i) => i !== index));
  }

  async function loadReusable(q: string) {
    setLoadingList(true);
    setReusable(await listReusablePdfs(q));
    setLoadingList(false);
  }

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-foreground">
        Materiais da aula <span className="font-normal text-foreground-muted">(PDFs que o aluno baixa embaixo do vídeo)</span>
      </label>

      {items.length > 0 && (
        <ul className="mb-2 divide-y divide-border rounded-md border border-border">
          {items.map((m, i) => (
            <li key={m.id ?? `${m.url}-${i}`} className="flex items-center gap-2.5 px-3 py-2">
              <FileText className="h-4 w-4 shrink-0 text-primary" />
              <span className="min-w-0 flex-1 truncate text-sm text-foreground">{m.title}</span>
              {!m.id && <span className="shrink-0 text-[11px] text-foreground-muted">salvo ao criar a aula</span>}
              <button type="button" onClick={() => remove(i)} aria-label={`Remover ${m.title}`} className="shrink-0 rounded p-1 text-foreground-muted hover:text-destructive">
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" disabled={progress !== null} onClick={() => fileRef.current?.click()}
          leftIcon={progress !== null ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}>
          {progress !== null ? `Enviando… ${progress}%` : "Enviar PDF"}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => { setSearch(""); setPickerOpen(true); loadReusable(""); }} leftIcon={<Library className="h-3.5 w-3.5" />}>
          Usar PDF existente
        </Button>
      </div>
      <input ref={fileRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />

      <Dialog open={pickerOpen} onClose={() => setPickerOpen(false)} title="Usar PDF existente" description="O mesmo arquivo é reaproveitado — nada é reenviado.">
        <div className="space-y-3">
          <Input placeholder="Buscar pelo nome (ex: mapa mental)" value={search} onChange={(e) => { setSearch(e.target.value); loadReusable(e.target.value); }} />
          <div className="max-h-80 divide-y divide-border overflow-y-auto rounded-lg border border-border">
            {loadingList && reusable.length === 0 ? (
              <p className="p-4 text-center text-sm text-foreground-muted">Carregando…</p>
            ) : reusable.length === 0 ? (
              <p className="p-4 text-center text-sm text-foreground-muted">Nenhum PDF encontrado.</p>
            ) : (
              reusable.map((r) => {
                const already = items.some((m) => m.url === r.url || m.title === r.title);
                return (
                  <div key={r.url} className="flex items-center gap-3 p-3">
                    <FileText className="h-4 w-4 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{r.title}</p>
                      <p className="truncate text-xs text-foreground-muted">{r.source}</p>
                    </div>
                    <Button size="sm" disabled={already} onClick={async () => { await attach(r.title, r.url); setPickerOpen(false); }} leftIcon={<Plus className="h-3.5 w-3.5" />}>
                      {already ? "Já anexado" : "Anexar"}
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Dialog>
    </div>
  );
}
