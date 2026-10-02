"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, XCircle, Trash2, HardDrive } from "lucide-react";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { previewDriveImport, importDriveVideo } from "@/lib/actions/drive-import";
import { cn } from "@/lib/utils/cn";

type ItemState = { fileId: string; title: string; status: "pending" | "running" | "ok" | "error"; error?: string };

// "Importar do Google Drive": cola o link de um vídeo ou de uma pasta; cada vídeo
// vira uma aula no fim do módulo. O Bunny baixa direto do Drive (não usa a internet de quem importa).
export function DriveImportDialog({ open, onClose, moduleId, moduleTitle }: { open: boolean; onClose: () => void; moduleId: string; moduleTitle: string }) {
  const router = useRouter();
  const { success, error } = useToast();
  const [link, setLink] = useState("");
  const [items, setItems] = useState<ItemState[] | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [publish, setPublish] = useState(false);
  const [busy, setBusy] = useState(false);
  const [running, setRunning] = useState(false);
  const finished = items?.length && items.every((i) => i.status === "ok" || i.status === "error");

  function reset() {
    setLink(""); setItems(null); setTruncated(false); setPublish(false);
  }
  function close() {
    if (running) return; // não interrompe no meio
    reset();
    onClose();
  }

  async function readLink() {
    setBusy(true);
    const res = await previewDriveImport(moduleId, link);
    setBusy(false);
    if (!res.success) { error(res.error); return; }
    setItems(res.items.map((i) => ({ ...i, status: "pending" })));
    setTruncated(res.kind === "folder" && res.truncated);
  }

  async function runImport() {
    if (!items) return;
    setRunning(true);
    let ok = 0;
    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx];
      if (item.status === "ok") continue;
      setItems((list) => list!.map((it, j) => (j === idx ? { ...it, status: "running", error: undefined } : it)));
      const res = await importDriveVideo(moduleId, { fileId: item.fileId, title: item.title }, publish);
      if (res.success) ok++;
      setItems((list) => list!.map((it, j) => (j === idx ? { ...it, status: res.success ? "ok" : "error", error: res.success ? undefined : res.error } : it)));
    }
    setRunning(false);
    router.refresh();
    if (ok) success(`${ok} aula${ok !== 1 ? "s" : ""} criada${ok !== 1 ? "s" : ""}. O Bunny está processando os vídeos.`);
  }

  const pendingCount = items?.filter((i) => i.status !== "ok").length ?? 0;

  return (
    <Dialog open={open} onClose={close} size="lg" title="Importar do Google Drive" description={`As aulas entram no fim de "${moduleTitle}".`}>
      {!items ? (
        <div className="space-y-4">
          <ol className="list-decimal space-y-1 rounded-lg border border-border bg-muted/30 py-3 pl-8 pr-3 text-xs text-foreground-muted">
            <li>No Google Drive, clique com o botão direito no <b>vídeo</b> ou na <b>pasta</b> › <b>Compartilhar</b>.</li>
            <li>Em &quot;Acesso geral&quot;, escolha <b>Qualquer pessoa com o link</b>.</li>
            <li>Clique em <b>Copiar link</b> e cole aqui.</li>
          </ol>
          <Input
            label="Link do vídeo ou da pasta"
            placeholder="https://drive.google.com/drive/folders/…"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && link.trim()) readLink(); }}
            autoFocus
          />
          <p className="text-xs text-foreground-muted">
            Numa pasta, cada vídeo vira uma aula, na ordem dos nomes (01, 02, 03…). Subpastas são ignoradas.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-foreground">
            <b>{items.length}</b> vídeo{items.length !== 1 ? "s" : ""} encontrado{items.length !== 1 ? "s" : ""}
            {truncated && <span className="text-foreground-muted"> (limite de 60 por vez — importe o resto depois)</span>}.
            {!running && !finished && " Ajuste os títulos se quiser."}
          </p>
          <ul className="max-h-[45vh] divide-y divide-border overflow-y-auto rounded-lg border border-border">
            {items.map((it, idx) => (
              <li key={it.fileId} className="flex items-center gap-2 px-3 py-2">
                <span className="w-6 shrink-0 text-right text-xs text-foreground-muted">{idx + 1}</span>
                {it.status === "pending" && !running ? (
                  <input
                    value={it.title}
                    onChange={(e) => setItems((list) => list!.map((x, j) => (j === idx ? { ...x, title: e.target.value } : x)))}
                    className="h-8 min-w-0 flex-1 rounded-md border border-border bg-card px-2 text-sm text-foreground"
                    aria-label={`Título da aula ${idx + 1}`}
                  />
                ) : (
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-foreground">{it.title}</span>
                    {it.error && <span className="block text-xs text-danger">{it.error}</span>}
                  </span>
                )}
                {it.status === "running" && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-brand" />}
                {it.status === "ok" && <CheckCircle2 className="h-4 w-4 shrink-0 text-ok" />}
                {it.status === "error" && <XCircle className="h-4 w-4 shrink-0 text-danger" />}
                {it.status === "pending" && !running && items.length > 1 && (
                  <button type="button" aria-label="Não importar este vídeo" onClick={() => setItems((list) => list!.filter((_, j) => j !== idx))} className="shrink-0 text-foreground-muted hover:text-danger">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
          {!finished && (
            <Switch checked={publish} onChange={setPublish} label="Publicar as aulas para os alunos" description="Desligado: as aulas entram como rascunho para você revisar antes." />
          )}
          <p className={cn("text-xs", running ? "font-semibold text-brand" : "text-foreground-muted")}>
            {running
              ? "Criando as aulas… não feche esta janela (alguns segundos por vídeo)."
              : finished
                ? "Pronto. Os vídeos continuam processando no Bunny (pode levar alguns minutos) — pode fechar."
                : "O Bunny baixa os vídeos direto do Drive: não depende da sua internet."}
          </p>
        </div>
      )}

      <DialogFooter>
        {!items ? (
          <>
            <Button variant="outline" onClick={close}>Cancelar</Button>
            <Button onClick={readLink} loading={busy} disabled={!link.trim()} leftIcon={<HardDrive className="h-4 w-4" />}>Ler link</Button>
          </>
        ) : finished && pendingCount === 0 ? (
          <Button onClick={close}>Concluir</Button>
        ) : (
          <>
            <Button variant="outline" onClick={finished ? close : reset} disabled={running}>{finished ? "Fechar" : "Voltar"}</Button>
            <Button onClick={runImport} loading={running}>
              {finished ? `Tentar de novo (${pendingCount})` : `Importar ${items.length} aula${items.length !== 1 ? "s" : ""}`}
            </Button>
          </>
        )}
      </DialogFooter>
    </Dialog>
  );
}
