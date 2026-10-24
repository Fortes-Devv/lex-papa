"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Link2, PlaySquare } from "lucide-react";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { createLessonsFromYoutube, linkYoutubeVideos, previewYoutubePlaylist, type YoutubeScope } from "@/lib/actions/youtube-import";
import { matchByOrder, matchByTitle, type MatchLesson, type MatchVideo } from "@/lib/youtube-match";
import { formatDuration, cn } from "@/lib/utils/cn";

type Mode = "title" | "order" | "create";

// "Importar playlist do YouTube": lê uma playlist (vídeos públicos ou não listados) e
// liga cada vídeo à sua aula (pelo título ou pela ordem) ou cria aulas novas.
// No curso inteiro, liga pelo título: uma playlist só pode cobrir todos os módulos.
export function YoutubeImportDialog({ open, onClose, scope, scopeTitle }: { open: boolean; onClose: () => void; scope: YoutubeScope; scopeTitle: string }) {
  const router = useRouter();
  const { success, error } = useToast();
  const isModule = scope.kind === "module";
  const [link, setLink] = useState("");
  const [data, setData] = useState<{ videos: MatchVideo[]; lessons: MatchLesson[] } | null>(null);
  const [mode, setMode] = useState<Mode>("title");
  const [playNow, setPlayNow] = useState(true);
  const [publish, setPublish] = useState(true);
  const [busy, setBusy] = useState(false);

  const result = useMemo(() => {
    if (!data || mode === "create") return null;
    return mode === "title" ? matchByTitle(data.lessons, data.videos) : matchByOrder(data.lessons, data.videos);
  }, [data, mode]);

  function close() {
    if (busy) return;
    setLink(""); setData(null); setMode("title"); setPlayNow(true); setPublish(true);
    onClose();
  }

  async function readLink() {
    setBusy(true);
    const res = await previewYoutubePlaylist(scope, link);
    setBusy(false);
    if (!res.success) { error(res.error); return; }
    setData({ videos: res.videos, lessons: res.lessons });
    // Módulo sem aulas: o natural é criar.
    if (isModule && res.lessons.length === 0) setMode("create");
  }

  async function save() {
    if (!data) return;
    setBusy(true);
    const res = mode === "create"
      ? await createLessonsFromYoutube((scope as { moduleId: string }).moduleId, data.videos.map((v) => ({ youtubeId: v.id, title: v.title, duration: v.duration })), publish)
      : await linkYoutubeVideos(scope, result!.pairs.map((p) => ({ lessonId: p.lesson.id, youtubeId: p.video.id, duration: p.video.duration })), playNow);
    setBusy(false);
    if (!res.success) { error(res.error); return; }
    router.refresh();
    success(mode === "create"
      ? `${res.count} aula${res.count !== 1 ? "s" : ""} criada${res.count !== 1 ? "s" : ""} com vídeo do YouTube.`
      : `${res.count} aula${res.count !== 1 ? "s" : ""} ligada${res.count !== 1 ? "s" : ""} ao YouTube${playNow ? " e já tocando de lá" : ""}.`);
    close();
  }

  const count = mode === "create" ? data?.videos.length ?? 0 : result?.pairs.length ?? 0;

  return (
    <Dialog open={open} onClose={close} size="lg" title="Importar playlist do YouTube" description={isModule ? `Módulo "${scopeTitle}".` : `Todas as aulas de "${scopeTitle}".`}>
      {!data ? (
        <div className="space-y-4">
          <ol className="list-decimal space-y-1 rounded-lg border border-border bg-muted/30 py-3 pl-8 pr-3 text-xs text-foreground-muted">
            <li>No YouTube Studio, envie os vídeos como <b>Não listado</b> (dá para arrastar vários de uma vez).</li>
            <li>Selecione os vídeos › <b>Adicionar à playlist</b>. A playlist também pode ser <b>não listada</b>.</li>
            <li>Abra a playlist, copie o link (tem <code>list=</code> no endereço) e cole aqui.</li>
          </ol>
          <Input label="Link da playlist" placeholder="https://www.youtube.com/playlist?list=…" value={link}
            onChange={(e) => setLink(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && link.trim()) readLink(); }} autoFocus />
          <p className="text-xs text-foreground-muted">
            {isModule
              ? "Os vídeos podem ser ligados às aulas que já existem (pelo título ou pela ordem) ou virar aulas novas."
              : "Cada vídeo é ligado à aula de mesmo título, em qualquer módulo do curso. O YouTube usa o nome do arquivo como título, igual ao import do Drive."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {isModule && (
            <div className="inline-flex rounded-lg bg-muted p-1" role="tablist" aria-label="Como usar os vídeos">
              {([["title", "Ligar pelo título"], ["order", "Ligar pela ordem"], ["create", "Criar aulas novas"]] as const).map(([m, label]) => (
                <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => setMode(m)}
                  className={cn("rounded-md px-3 py-1.5 text-xs font-bold transition-colors", mode === m ? "bg-card text-foreground shadow-sm" : "text-foreground-muted hover:text-foreground")}>
                  {label}
                </button>
              ))}
            </div>
          )}

          {mode === "create" ? (
            <>
              <p className="text-sm text-foreground"><b>{data.videos.length}</b> vídeo{data.videos.length !== 1 ? "s" : ""} vão virar aulas no fim do módulo.</p>
              <ul className="max-h-[42vh] divide-y divide-border overflow-y-auto rounded-lg border border-border">
                {data.videos.map((v, i) => (
                  <li key={v.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                    <span className="w-6 shrink-0 text-right text-xs text-foreground-muted">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate text-foreground">{v.title}</span>
                    {v.duration ? <span className="shrink-0 text-xs tabular-nums text-foreground-muted">{formatDuration(v.duration)}</span> : null}
                  </li>
                ))}
              </ul>
              <Switch checked={publish} onChange={setPublish} label="Publicar as aulas para os alunos" description="Desligue para as aulas entrarem como rascunho." />
            </>
          ) : result && (
            <>
              <p className="text-sm text-foreground">
                <b>{result.pairs.length}</b> de {data.lessons.length} aula{data.lessons.length !== 1 ? "s" : ""} com vídeo encontrado
                {result.lessonsWithout.length > 0 && <> · <span className="font-semibold text-warning">{result.lessonsWithout.length} sem vídeo</span></>}
                {result.videosUnused.length > 0 && <> · {result.videosUnused.length} vídeo{result.videosUnused.length !== 1 ? "s" : ""} sobrando</>}
              </p>
              <ul className="max-h-[38vh] divide-y divide-border overflow-y-auto rounded-lg border border-border">
                {result.pairs.map(({ lesson, video }) => (
                  <li key={lesson.id} className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-3 py-2 text-sm">
                    <span className="min-w-0">
                      <span className="block truncate text-foreground">{lesson.title}</span>
                      {lesson.moduleTitle && <span className="block truncate text-xs text-foreground-muted">{lesson.moduleTitle}</span>}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-foreground-muted" />
                    <span className="flex min-w-0 items-center gap-1.5 text-foreground-muted">
                      <PlaySquare className="h-3.5 w-3.5 shrink-0 text-danger" />
                      <span className="truncate">{video.title}</span>
                    </span>
                  </li>
                ))}
                {result.pairs.length === 0 && <li className="px-3 py-6 text-center text-sm text-foreground-muted">Nenhuma aula com o mesmo título. Confira a playlist ou tente &quot;Ligar pela ordem&quot;.</li>}
              </ul>
              {(result.lessonsWithout.length > 0 || result.videosUnused.length > 0) && (
                <details className="rounded-lg border border-border px-3 py-2 text-xs text-foreground-muted">
                  <summary className="cursor-pointer font-semibold text-foreground">Ver o que ficou sem par</summary>
                  {result.lessonsWithout.length > 0 && <p className="mt-2"><b>Aulas sem vídeo</b> (continuam como estão): {result.lessonsWithout.map((l) => l.title).join(" · ")}</p>}
                  {result.videosUnused.length > 0 && <p className="mt-2"><b>Vídeos sem aula</b>: {result.videosUnused.map((v) => v.title).join(" · ")}</p>}
                </details>
              )}
              <Switch checked={playNow} onChange={setPlayNow} label="Já tocar do YouTube"
                description="O vídeo da Bunny continua guardado como reserva. Dá para voltar pelo menu do módulo." />
            </>
          )}
        </div>
      )}

      <DialogFooter>
        {!data ? (
          <>
            <Button variant="outline" onClick={close}>Cancelar</Button>
            <Button onClick={readLink} loading={busy} disabled={!link.trim()} leftIcon={<Link2 className="h-4 w-4" />}>Ler playlist</Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={() => setData(null)} disabled={busy}>Voltar</Button>
            <Button onClick={save} loading={busy} disabled={count === 0}>
              {mode === "create" ? `Criar ${count} aula${count !== 1 ? "s" : ""}` : `Ligar ${count} aula${count !== 1 ? "s" : ""}`}
            </Button>
          </>
        )}
      </DialogFooter>
    </Dialog>
  );
}
