"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Maximize, Minimize, Pause, Play, RotateCcw, SkipBack, SkipForward, Volume1, Volume2, VolumeX } from "lucide-react";
import { cn, formatDuration } from "@/lib/utils/cn";
import { youtubeThumb } from "@/lib/youtube";
import { SeekBar } from "./seek-bar";
import { MovingWatermark } from "./moving-watermark";

// Player das aulas que tocam do YouTube (IFrame Player API), no padrão do metodocev:
// o vídeo vem do YouTube, mas os controles são nossos (controls:0). Uma camada por cima
// do iframe recebe os cliques, a capa própria cobre a tela inicial do YouTube e as faixas
// de cima e de baixo cobrem título e logo quando o vídeo pausa. A tela cheia é no
// contêiner, para tudo isso continuar por cima.

type YTPlayer = {
  playVideo(): void; pauseVideo(): void; seekTo(s: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number; getDuration(): number; getPlayerState(): number; getVideoLoadedFraction(): number;
  setVolume(v: number): void; mute(): void; unMute(): void; setPlaybackRate(r: number): void; destroy(): void;
  unloadModule?(name: string): void; setOption?(module: string, option: string, value: unknown): void;
};
type YTNamespace = {
  Player: new (el: HTMLElement, opts: {
    host?: string; videoId: string; width?: string; height?: string;
    playerVars?: Record<string, string | number>;
    events?: { onReady?: () => void; onStateChange?: (e: { data: number }) => void; onError?: (e: { data: number }) => void; onApiChange?: () => void };
  }) => YTPlayer;
};
declare global {
  interface Window { YT?: YTNamespace; onYouTubeIframeAPIReady?: () => void }
}

const STATE = { ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3 } as const;
const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

// Legendas automáticas do YouTube: cc_load_policy:0 nem sempre basta (a preferência da
// conta do aluno pode ligar). Descarregar o módulo de legendas desliga de vez.
function hideCaptions(p: YTPlayer | null) {
  try {
    p?.setOption?.("captions", "track", {});
    p?.unloadModule?.("captions");
    p?.unloadModule?.("cc");
  } catch { /* módulo ainda não carregado */ }
}

// Carrega a IFrame API uma vez só.
let apiPromise: Promise<YTNamespace> | null = null;
function loadApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  apiPromise ??= new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(window.YT!); };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  });
  return apiPromise;
}

export interface YouTubePlayerProps {
  videoId: string;
  title?: string;
  watermark?: string;
  viewerMark?: string; // marca-d'água do aluno (nome + código da conta)
  className?: string;
  autoPlay?: boolean;
  startAt?: number;
  onComplete?: () => void;
  onTimeUpdate?: (time: number, duration: number) => void;
  onPause?: (time: number, duration: number) => void;
  seekRef?: React.MutableRefObject<((seconds: number) => void) | null>;
}

export function YouTubePlayer({ videoId, title, watermark, viewerMark, className, autoPlay, startAt, onComplete, onTimeUpdate, onPause, seekRef }: YouTubePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const controlsTimer = useRef<ReturnType<typeof setTimeout>>();
  // Callbacks mais recentes (o player é criado uma vez por vídeo).
  const cb = useRef({ onComplete, onTimeUpdate, onPause });
  cb.current = { onComplete, onTimeUpdate, onPause };

  const [ready, setReady] = useState(false);
  const [started, setStarted] = useState(false); // passou da capa
  const [playing, setPlaying] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [ended, setEnded] = useState(false);
  const [error, setError] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(100);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [fullscreen, setFullscreen] = useState(false); // tela cheia de verdade
  const [pseudoFull, setPseudoFull] = useState(false); // iPhone: ocupa a tela com CSS
  const [showControls, setShowControls] = useState(true);
  const [tampered, setTampered] = useState(false);
  const tamperedRef = useRef(false);

  // Cria o player do YouTube.
  useEffect(() => {
    let destroyed = false;
    const resume = startAt && startAt > 5 ? Math.floor(startAt) : 0;
    loadApi().then((YT) => {
      if (destroyed || !stageRef.current) return;
      const mount = document.createElement("div");
      stageRef.current.innerHTML = "";
      stageRef.current.appendChild(mount);
      playerRef.current = new YT.Player(mount, {
        host: "https://www.youtube-nocookie.com",
        videoId,
        width: "100%",
        height: "100%",
        playerVars: {
          controls: 0, disablekb: 1, modestbranding: 1, rel: 0, iv_load_policy: 3,
          playsinline: 1, fs: 0, cc_load_policy: 0, origin: window.location.origin,
          ...(resume ? { start: resume } : {}),
        },
        events: {
          onReady: () => {
            if (destroyed) return;
            const p = playerRef.current!;
            hideCaptions(p);
            setReady(true);
            setDuration(p.getDuration() || 0);
            if (resume) setCurrentTime(resume);
            if (autoPlay) { setStarted(true); p.playVideo(); }
          },
          onStateChange: ({ data }) => {
            const p = playerRef.current;
            if (!p) return;
            if (data === STATE.PLAYING) { hideCaptions(p); setPlaying(true); setWaiting(false); setEnded(false); setStarted(true); setDuration(p.getDuration() || 0); }
            else if (data === STATE.BUFFERING) setWaiting(true);
            else if (data === STATE.PAUSED) { setPlaying(false); setWaiting(false); setShowControls(true); cb.current.onPause?.(p.getCurrentTime(), p.getDuration() || 0); }
            else if (data === STATE.ENDED) { setPlaying(false); setWaiting(false); setEnded(true); setShowControls(true); cb.current.onComplete?.(); }
          },
          onError: () => setError(true),
          // O módulo de legendas carrega depois do play: desliga quando ele aparecer.
          onApiChange: () => hideCaptions(playerRef.current),
        },
      });
    });
    return () => { destroyed = true; playerRef.current?.destroy(); playerRef.current = null; };
    // Recria só quando muda o vídeo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  // Tempo: a IFrame API não tem evento de progresso; lê a cada meio segundo enquanto toca.
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      const p = playerRef.current;
      if (!p) return;
      const now = p.getCurrentTime();
      const d = p.getDuration() || 0;
      setCurrentTime(now);
      setBuffered((p.getVideoLoadedFraction() || 0) * d);
      cb.current.onTimeUpdate?.(now, d);
    }, 500);
    return () => clearInterval(t);
  }, [playing]);

  const play = useCallback(() => { if (tamperedRef.current) return; setStarted(true); setEnded(false); playerRef.current?.playVideo(); }, []);
  const togglePlay = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    if (p.getPlayerState() === STATE.PLAYING) p.pauseVideo();
    else play();
  }, [play]);

  function seekToTime(seconds: number) {
    const p = playerRef.current;
    if (!p) return;
    const t = Math.min(Math.max(seconds, 0), duration || seconds);
    p.seekTo(t, true);
    setCurrentTime(t);
    cb.current.onTimeUpdate?.(t, duration);
  }
  const skip = (s: number) => seekToTime((playerRef.current?.getCurrentTime() ?? 0) + s);
  function changeSpeed(s: number) { playerRef.current?.setPlaybackRate(s); setSpeed(s); setShowSpeedMenu(false); }
  function changeVolume(v: number) {
    const p = playerRef.current;
    if (!p) return;
    p.setVolume(v);
    if (v === 0) p.mute(); else p.unMute();
    setVolume(v);
    setMuted(v === 0);
  }
  function toggleMute() {
    const p = playerRef.current;
    if (!p) return;
    if (muted) { p.unMute(); setMuted(false); } else { p.mute(); setMuted(true); }
  }
  function toggleFullscreen() {
    if (document.fullscreenElement) { document.exitFullscreen(); return; }
    if (pseudoFull) { setPseudoFull(false); return; }
    const el = containerRef.current;
    if (el?.requestFullscreen) el.requestFullscreen().catch(() => setPseudoFull(true));
    else setPseudoFull(true); // iPhone não deixa um <div> entrar em tela cheia
  }

  // Capítulos: o pai pede para pular para um tempo (e tocar).
  useEffect(() => {
    if (!seekRef) return;
    seekRef.current = (seconds: number) => { seekToTime(seconds); play(); };
    return () => { seekRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seekRef, duration]);

  useEffect(() => {
    const handler = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const revealControls = useCallback(() => {
    setShowControls(true);
    clearTimeout(controlsTimer.current);
    if (playerRef.current?.getPlayerState() === STATE.PLAYING) {
      controlsTimer.current = setTimeout(() => setShowControls(false), 2800);
    }
  }, []);

  // Atalhos (o teclado do YouTube fica desligado: disablekb).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName ?? "")) return;
      if (e.key === " " || e.key === "k") { e.preventDefault(); togglePlay(); revealControls(); }
      else if (e.key === "ArrowRight") { skip(5); revealControls(); }
      else if (e.key === "ArrowLeft") { skip(-5); revealControls(); }
      else if (e.key === "f") toggleFullscreen();
      else if (e.key === "m") toggleMute();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [togglePlay, revealControls, duration, muted, pseudoFull]);

  const isFull = fullscreen || pseudoFull;
  const visible = showControls || !playing;
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPct = duration > 0 ? (buffered / duration) * 100 : 0;
  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 50 ? Volume1 : Volume2;
  const lastTap = useRef(0);

  return (
    <div
      ref={containerRef}
      className={cn(
        "group relative select-none overflow-hidden bg-black",
        pseudoFull ? "fixed inset-0 z-[1400] flex items-center" : fullscreen ? "flex h-screen w-screen items-center" : cn("rounded-lg", className),
      )}
      onMouseMove={revealControls}
      onMouseLeave={() => playing && setShowControls(false)}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className={cn("relative w-full", isFull ? "h-full" : "aspect-video")}>
        {/* Vídeo do YouTube (sem cliques: a camada abaixo recebe tudo) */}
        <div ref={stageRef} className="pointer-events-none absolute inset-0 [&>iframe]:h-full [&>iframe]:w-full" />

        {/* Camada de cliques: toque pausa/toca, toque duplo nas laterais pula 10 s, clique duplo = tela cheia */}
        {started && (
          <div className="absolute inset-0 z-10 flex">
            {([-10, 0, 10] as const).map((jump) => (
              <button
                key={jump}
                type="button"
                aria-label={jump === 0 ? (playing ? "Pausar" : "Reproduzir") : jump < 0 ? "Voltar 10 segundos" : "Avançar 10 segundos"}
                className={cn("h-full cursor-default focus:outline-none", jump === 0 ? "flex-[2]" : "flex-1", !visible && "cursor-none")}
                onClick={(e) => {
                  const now = Date.now();
                  const double = now - lastTap.current < 300;
                  lastTap.current = now;
                  if (double) { if (jump === 0) toggleFullscreen(); else skip(jump); return; }
                  if (e.detail <= 1) setTimeout(() => { if (Date.now() - lastTap.current >= 300) togglePlay(); }, 300);
                  revealControls();
                }}
              />
            ))}
          </div>
        )}

        {viewerMark && started && (
          <MovingWatermark text={viewerMark} onTamper={(t) => { tamperedRef.current = t; setTampered(t); if (t) playerRef.current?.pauseVideo(); }} />
        )}

        {/* Marca do aluno escondida pelas ferramentas do navegador: o vídeo não toca */}
        {tampered && (
          <div className="absolute inset-0 z-[45] flex items-center justify-center bg-black px-6 text-center text-sm font-semibold text-white">
            Vídeo pausado: a identificação do aluno precisa ficar visível. Recarregue a página.
          </div>
        )}

        {/* Faixa de cima: cobre título e canal do YouTube quando pausa */}
        <div className={cn("pointer-events-none absolute inset-x-0 top-0 z-20 flex h-[72px] items-start justify-between bg-gradient-to-b from-black/95 via-black/70 to-transparent px-4 pt-3 transition-opacity duration-300", visible || !started ? "opacity-100" : "opacity-0")}>
          {title && <p className="line-clamp-1 max-w-[75%] text-sm font-semibold text-white/90">{title}</p>}
          {watermark && <span className="text-xs font-semibold tracking-wide text-white/40">{watermark}</span>}
        </div>

        {/* Capa própria antes do primeiro play (cobre a tela inicial do YouTube) */}
        {!started && (
          <button type="button" onClick={play} disabled={!ready} aria-label={`Assistir ${title ?? "aula"}`}
            className="group/cover absolute inset-0 z-30 flex items-center justify-center bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element -- miniatura do próprio vídeo */}
            <img src={youtubeThumb(videoId)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" />
            <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/60" />
            <span className="relative flex flex-col items-center gap-3">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary shadow-2xl transition-transform group-hover/cover:scale-110">
                {ready ? <Play className="ml-1 h-8 w-8 text-white" /> : <Loader2 className="h-7 w-7 animate-spin text-white" />}
              </span>
              {startAt && startAt > 5 ? <span className="rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white">Continua em {formatDuration(Math.floor(startAt))}</span> : null}
            </span>
          </button>
        )}

        {/* Fim da aula: cobre a grade de vídeos sugeridos do YouTube */}
        {ended && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-black/95 px-6 text-center">
            <p className="text-base font-bold text-white">Aula concluída</p>
            <button type="button" onClick={() => { seekToTime(0); play(); }}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-white/10 px-4 text-sm font-semibold text-white hover:bg-white/20">
              <RotateCcw className="h-4 w-4" /> Assistir de novo
            </button>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-2 bg-black px-6 text-center">
            <p className="text-sm font-semibold text-white">Não foi possível carregar este vídeo.</p>
            <p className="text-xs text-white/60">Recarregue a página. Se continuar, avise a equipe pelo campo de dúvidas da aula.</p>
          </div>
        )}

        {waiting && started && !ended && (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-white/80" />
          </div>
        )}

        {/* Barra de baixo, sólida: cobre o botão "YouTube" que aparece ao pausar */}
        {started && (
          <div className={cn("absolute inset-x-0 bottom-0 z-20 bg-black/95 px-3 pb-2 pt-1 transition-opacity duration-300", visible ? "opacity-100" : "pointer-events-none opacity-0")}>
            <SeekBar progress={progress} buffered={bufferedPct} onSeek={(pct) => seekToTime(pct * duration)} />
            <div className="mt-1 flex items-center gap-1">
              <button onClick={togglePlay} className="p-1.5 text-white transition-colors hover:text-primary" aria-label={playing ? "Pausar" : "Reproduzir"}>
                {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </button>
              <button onClick={() => skip(-10)} className="hidden p-1.5 text-white/80 transition-colors hover:text-white sm:inline-flex" aria-label="Voltar 10s"><SkipBack className="h-4 w-4" /></button>
              <button onClick={() => skip(10)} className="hidden p-1.5 text-white/80 transition-colors hover:text-white sm:inline-flex" aria-label="Avançar 10s"><SkipForward className="h-4 w-4" /></button>
              <div className="group/vol flex items-center">
                <button onClick={toggleMute} className="p-1.5 text-white/80 transition-colors hover:text-white" aria-label="Volume"><VolumeIcon className="h-4 w-4" /></button>
                <input type="range" min={0} max={100} step={5} value={muted ? 0 : volume} onChange={(e) => changeVolume(Number(e.target.value))}
                  className="ml-0 h-1 w-0 cursor-pointer opacity-0 accent-primary transition-all duration-200 group-hover/vol:ml-1 group-hover/vol:w-16 group-hover/vol:opacity-100" aria-label="Ajustar volume" />
              </div>
              <span className="ml-1 font-mono text-xs tabular-nums text-white/80">
                {formatDuration(Math.floor(currentTime))} / {formatDuration(Math.floor(duration))}
              </span>
              <div className="flex-1" />
              <div className="relative">
                <button onClick={() => setShowSpeedMenu((s) => !s)} className="rounded bg-white/10 px-2 py-1 text-xs font-semibold text-white/90 transition-colors hover:bg-white/20 hover:text-white">{speed}×</button>
                {showSpeedMenu && (
                  <div className="absolute bottom-full right-0 z-20 mb-2 min-w-[72px] rounded-lg border border-border bg-card py-1 shadow-xl">
                    {SPEEDS.map((s) => (
                      <button key={s} onClick={() => changeSpeed(s)} className={cn("block w-full px-3 py-1.5 text-left text-xs transition-colors hover:bg-muted", s === speed ? "font-semibold text-primary" : "text-foreground")}>{s}×</button>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={toggleFullscreen} className="p-1.5 text-white/80 transition-colors hover:text-white" aria-label="Tela cheia">
                {isFull ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
