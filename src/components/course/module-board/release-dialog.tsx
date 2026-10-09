"use client";
import { useEffect, useState } from "react";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";
import type { EditorModule } from "./types";

// "Liberação das aulas": marcar quais aulas do módulo só abrem X dias após a compra.
// As não marcadas ficam liberadas na hora (o aluno já consome essas).
export function ReleaseDialog({ mod, onClose, onSave }: {
  mod: EditorModule | null;
  onClose: () => void;
  onSave: (lessonIds: string[], days: number) => Promise<boolean>;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [days, setDays] = useState("7");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!mod) return;
    const delayed = mod.lessons.filter((l) => l.dripDays > 0);
    setSelected(delayed.map((l) => l.id));
    setDays(String(delayed[0]?.dripDays ?? 7));
  }, [mod]);

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const n = Number(days) || 0;

  return (
    <Dialog open={!!mod} onClose={onClose} size="lg" title="Liberação das aulas"
      description="Marque as aulas que só abrem depois de alguns dias da compra. As outras ficam liberadas na hora.">
      {mod && (
        <div className="space-y-4">
          <div className="flex items-end gap-3">
            <div className="w-40"><Input label="Liberar após (dias)" type="number" min="1" max="365" value={days} onChange={(e) => setDays(e.target.value)} /></div>
            <div className="flex gap-2 pb-0.5 text-xs">
              <button type="button" className="font-semibold text-brand" onClick={() => setSelected(mod.lessons.map((l) => l.id))}>Marcar todas</button>
              <span className="text-foreground-muted">·</span>
              <button type="button" className="font-semibold text-brand" onClick={() => setSelected([])}>Nenhuma</button>
            </div>
          </div>
          <ul className="max-h-[50vh] divide-y divide-border overflow-y-auto rounded-lg border border-border">
            {mod.lessons.map((l, i) => {
              const on = selected.includes(l.id);
              return (
                <li key={l.id}>
                  <label className={cn("flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm", on && "bg-brand-soft/50 dark:bg-brand/10")}>
                    <input type="checkbox" checked={on} onChange={() => toggle(l.id)} className="h-4 w-4 shrink-0 accent-[#f26a1b]" />
                    <span className="w-6 shrink-0 text-right text-xs text-foreground-muted">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate text-foreground">{l.title}</span>
                    <span className={cn("shrink-0 text-xs font-semibold", on ? "text-brand" : "text-ok-text dark:text-ok")}>{on ? `após ${n} dia${n !== 1 ? "s" : ""}` : "na hora"}</span>
                  </label>
                </li>
              );
            })}
            {mod.lessons.length === 0 && <li className="px-3 py-6 text-center text-sm text-foreground-muted">Este módulo ainda não tem aulas.</li>}
          </ul>
          <p className="text-xs text-foreground-muted">Vale para vídeo e PDF da aula. Os dias contam a partir da compra de cada aluno. Se o módulo estiver em outros cursos, vale lá também.</p>
        </div>
      )}
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button loading={saving} disabled={selected.length > 0 && n < 1} onClick={async () => {
          setSaving(true);
          const ok = await onSave(selected, n);
          setSaving(false);
          if (ok) onClose();
        }}>Salvar</Button>
      </DialogFooter>
    </Dialog>
  );
}
