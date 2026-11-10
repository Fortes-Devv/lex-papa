"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Link2, PlaySquare } from "lucide-react";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { createLessonsFromYoutube, linkYoutubeVideos, previewYoutubePlaylist, watchModulePlaylist, type YoutubeScope } from "@/lib/actions/youtube-import";
import { matchByOrder, matchByTitle, type MatchLesson, type MatchVideo } from "@/lib/youtube-match";
import { formatDuration, cn } from "@/lib/utils/cn";

type Mode = "title" | "order" | "create";

// "Importar playlist do YouTube": lê uma playlist (vídeos públicos ou não listados) e
// liga cada vídeo à sua aula (pelo título ou pela ordem) ou cria aulas novas.
// No curso inteiro, liga pelo título: uma playlist só pode cobrir todos os módulos.
// No módulo, dá para "acompanhar" a playlist: vídeos novos nela viram aulas sozinhos.
export function YoutubeImportDialog({ open, onClose, scope, scopeTitle, autoPublish: initialAutoPublish = false }: {
  open: boolean; onClose: () => void; scope: YoutubeScope; scopeTitle: string; autoPublish?: boolean;
}) {
  const router = useRouter();
  const { success, error } = useToast();
  const isModule = scope.kind === "module";
  const [link, setLink] = useState("");
  const [data, setData] = useState<{ playlistId: string; videos: MatchVideo[]; lessons: MatchLesson[]; existingYoutubeIds: string[]; hiddenPositions: number[] } | null>(null);
  const [mode, setMode] = useState<Mode>("title");
  const [playNow, setPlayNow] = useState(true);
  const [publish, setPublish] = useState(true);
  const [watch, setWatch] = useState(true);
  const [autoPublish, setAutoPublish] = useState(initialAutoPublish);
  const [busy, setBusy] = useState(false);

  // "Criar aulas novas" só cria os vídeos que ainda não estão no módulo.
  const newVideos = useMemo(() => {
    if (!data) return [];
    const known = new Set(data.existingYoutubeIds);
    return data.videos.filter((v) => !known.has(v.id));
  }, [data]);

  const result = useMemo(() => {
    if (!data || mode === "create") return null;
    return mode === "title" ? matchByTitle(data.lessons, data.videos) : matchByOrder(data.lessons, data.videos);
  }, [data, mode]);

  function close() {
    if (busy) return;
    setLink(""); setData(null); setMode("title"); setPlayNow(true); setPublish(true); setWatch(true); setAutoPublish(initialAutoPublish);
    onClose();
  }

  async function readLink() {
    setBusy(true);
    const res = await previewYoutubePlaylist(scope, link);
    setBusy(false);
    if (!res.success) { error(res.error); return; }
    setData({ playlistId: res.playlistId, videos: res.videos, lessons: res.lessons, existingYoutubeIds: res.existingYoutubeIds, hiddenPositions: res.hiddenPositions });
    // Módulo sem aulas, ou playlist já importada antes: o natural é criar (só os novos).
    if (isModule && (res.lessons.length === 0 || res.existingYoutubeIds.length > 0)) setMode("create");
  }

  async function save() {
    if (!data) return;
    setBusy(true);
    const moduleId = isModule ? (scope as { moduleId: string }).moduleId : null;
    let message = "";
    if (count > 0) {
      const res = mode === "create"
        ? await createLessonsFromYoutube(moduleId!, newVideos.map((v) => ({ youtubeId: v.id, title: v.title, duration: v.duration })), publish)
        : await linkYoutubeVideos(scope, result!.pairs.map((p) => ({ lessonId: p.lesson.id, youtubeId: p.video.id, duration: p.video.duration })), playNow);
      if (!res.success) { setBusy(false); error(res.error); return; }
      message = mode === "create"
        ? `${res.count} aula${res.count !== 1 ? "s" : ""} criada${res.count !== 1 ? "s" : ""} com vídeo do YouTube.`
        : `${res.count} aula${res.count !== 1 ? "s" : ""} ligada${res.count !== 1 ? "s" : ""} ao YouTube${playNow ? " e já tocando de lá" : ""}.`;
    }
    if (moduleId && watch) {
      const res = await watchModulePlaylist(moduleId, data.playlistId, autoPublish);
      if (!res.success) { setBusy(false); error(res.error); return; }
      message = `${message} Playlist acompanhada: vídeos novos nela viram aulas${autoPublish ? " publicadas" : " em rascunho"}.`.trim();
    }
    setBusy(false);
    router.refresh();
    success(message);
    close();
  }

  const count = mode === "create" ? newVideos.length : result?.pairs.length ?? 0;
  const canWatch = isModule;

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
          {data.hiddenPositions.length > 0 && (
            <p className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-foreground">
              <b>{data.hiddenPositions.length === 1 ? "1 vídeo da playlist ficou de fora" : `${data.hiddenPositions.length} vídeos da playlist ficaram de fora`}</b> (posição {data.hiddenPositions.join(", ")}): privado ou apagado. Se for privado, mude para <b>Não listado</b> no YouTube Studio e leia a playlist de novo.
            </p>
          )}
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
              <p className="text-sm text-foreground">
                {newVideos.length > 0
                  ? <><b>{newVideos.length}</b> vídeo{newVideos.length !== 1 ? "s" : ""} novo{newVideos.length !== 1 ? "s" : ""} vão virar aulas no fim do módulo.</>
                  : <>Nenhum vídeo novo: todos os vídeos da playlist já estão em aulas do módulo.</>}
                {data.videos.length > newVideos.length && newVideos.length > 0 && <span className="text-foreground-muted"> ({data.videos.length - newVideos.length} já estão no módulo)</span>}
              </p>
              {newVideos.length > 0 && <ul className="max-h-[36vh] divide-y divide-border overflow-y-auto rounded-lg border border-border">
                {newVideos.map((v, i) => (
                  <li key={v.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                    <span className="w-6 shrink-0 text-right text-xs text-foreground-muted">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate text-foreground">{v.title}</span>
                    {v.duration ? <span className="shrink-0 text-xs tabular-nums text-foreground-muted">{formatDuration(v.duration)}</span> : null}
                  </li>
                ))}
              </ul>}
              {newVideos.length > 0 && <Switch checked={publish} onChange={setPublish} label="Publicar as aulas para os alunos" description="Desligue para as aulas entrarem como rascunho." />}
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

          {canWatch && (
            <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
              <Switch checked={watch} onChange={setWatch} label="Acompanhar esta playlist"
                description="Todo dia a plataforma confere a playlist e cria as aulas dos vídeos novos no fim do módulo. Também dá para puxar na hora pelo menu do módulo (Sincronizar)." />
              {watch && (
                <>
                  <Switch checked={autoPublish} onChange={setAutoPublish} label="Aulas novas já entram publicadas"
                    description={autoPublish ? "O aluno vê a aula assim que ela entrar. Confira o título do vídeo no YouTube Studio antes de pôr na playlist." : "Entram como rascunho: você confere o título e publica."} />
                  {mode !== "create" && result && result.videosUnused.length > 0 && (
                    <p className="text-xs text-warning">Os {result.videosUnused.length} vídeo{result.videosUnused.length !== 1 ? "s" : ""} sem aula vão virar aulas novas na próxima sincronização.</p>
                  )}
                </>
              )}
            </div>
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
            <Button onClick={save} loading={busy} disabled={count === 0 && !(canWatch && watch)}>
              {count === 0 ? "Acompanhar playlist" : mode === "create" ? `Criar ${count} aula${count !== 1 ? "s" : ""}` : `Ligar ${count} aula${count !== 1 ? "s" : ""}`}
            </Button>
          </>
        )}
      </DialogFooter>
    </Dialog>
  );
}

// Mensagem do "Sincronizar playlist do YouTube" (menu do módulo e Mentoria).
export function syncMessage(res: { created: number; hiddenPositions: number[] }, autoPublish: boolean) {
  const base = res.created > 0
    ? `${res.created} aula${res.created !== 1 ? "s" : ""} nova${res.created !== 1 ? "s" : ""} da playlist${autoPublish ? ", já publicada" + (res.created !== 1 ? "s" : "") : ", em rascunho"}.`
    : "Nenhum vídeo novo na playlist.";
  const hidden = res.hiddenPositions.length;
  return hidden > 0 ? `${base} ${hidden} vídeo${hidden !== 1 ? "s" : ""} privado${hidden !== 1 ? "s" : ""} ou apagado${hidden !== 1 ? "s ficaram" : " ficou"} de fora.` : base;
}
