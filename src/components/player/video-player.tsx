"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  Play, Pause, Volume2, Volume1, VolumeX, Maximize, Minimize,
  SkipForward, SkipBack, PictureInPicture, Loader2, RotateCcw,
} from "lucide-react";
import { cn, formatDuration } from "@/lib/utils/cn";

interface VideoPlayerProps {
  title?: string;
  watermark?: string;
  onComplete?: () => void;
  className?: string;
  src?: string;
  autoPlay?: boolean;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

export function VideoPlayer({ title, watermark, onComplete, className, src, autoPlay }: VideoPlayerProps) {
  if (src) {
    return <RealVideoPlayer key={src} src={src} title={title} watermark={watermark} onComplete={onComplete} className={className} autoPlay={autoPlay} />;
  }
  return <MockVideoPlayer watermark={watermark} onComplete={onComplete} className={className} />;
}

function RealVideoPlayer({ src, watermark, onComplete, className, autoPlay }: VideoPlayerProps & { src: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsTimer = useRef<ReturnType<typeof setTimeout>>();

  const [playing, setPlaying] = useState(false);
  const [waiting, setWaiting] = useState(true);
  const [ended, setEnded] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [error, setError] = useState(false);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPct = duration > 0 ? (buffered / duration) * 100 : 0;

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play();
    else v.pause();
  }, []);

  function seekTo(pct: number) {
    const v = videoRef.current;
    if (!v || !duration) return;
    v.currentTime = Math.min(Math.max(pct, 0), 1) * duration;
  }
  function skip(seconds: number) {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.min(Math.max(v.currentTime + seconds, 0), duration);
  }
  function changeSpeed(s: number) {
    if (videoRef.current) videoRef.current.playbackRate = s;
    setSpeed(s);
    setShowSpeedMenu(false);
  }
  function changeVolume(val: number) {
    const v = videoRef.current;
    if (!v) return;
    v.volume = val;
    v.muted = val === 0;
    setVolume(val);
    setMuted(val === 0);
  }
  function toggleMute() {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  }
  function toggleFullscreen() {
    if (document.fullscreenElement) { document.exitFullscreen(); return; }
    const container = containerRef.current;
    const video = videoRef.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
    if (container?.requestFullscreen) {
      // Alguns navegadores mobile (iOS) recusam fullscreen em <div>; cai para o
      // fullscreen nativo do próprio <video>.
      container.requestFullscreen().catch(() => video?.webkitEnterFullscreen?.());
    } else {
      video?.webkitEnterFullscreen?.();
    }
  }
  async function togglePiP() {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await v.requestPictureInPicture();
    } catch { /* PiP não suportado */ }
  }

  // Fonte do vídeo: HLS (Bunny/.m3u8) via hls.js, ou arquivo direto (mp4).
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    setError(false);
    const isHls = src.includes(".m3u8");

    if (isHls && !video.canPlayType("application/vnd.apple.mpegurl")) {
      // Chrome/Firefox: precisa do hls.js
      let destroyed = false;
      let hlsInstance: { destroy: () => void } | null = null;
      import("hls.js").then(({ default: Hls }) => {
        if (destroyed) return;
        if (Hls.isSupported()) {
          const hls = new Hls({ enableWorker: true });
          hls.on(Hls.Events.ERROR, (_e, data) => {
            // Erro fatal (ex: manifesto ainda não existe = vídeo em encode) → mostra aviso.
            if (data.fatal) { setError(true); setWaiting(false); }
          });
          hls.loadSource(src);
          hls.attachMedia(video);
          hlsInstance = hls;
        } else {
          video.src = src; // fallback
        }
      });
      return () => { destroyed = true; hlsInstance?.destroy(); };
    } else {
      // Safari (HLS nativo) ou arquivo direto
      video.src = src;
    }
  }, [src]);

  // Fullscreen state sync
  useEffect(() => {
    const handler = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // Auto-hide controls
  const revealControls = useCallback(() => {
    setShowControls(true);
    clearTimeout(controlsTimer.current);
    if (videoRef.current && !videoRef.current.paused) {
      controlsTimer.current = setTimeout(() => setShowControls(false), 2800);
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!containerRef.current?.matches(":hover") && document.activeElement?.tagName === "TEXTAREA") return;
      if (["INPUT", "TEXTAREA"].includes((document.activeElement?.tagName ?? ""))) return;
      if (e.key === " " || e.key === "k") { e.preventDefault(); togglePlay(); revealControls(); }
      else if (e.key === "ArrowRight") { skip(5); revealControls(); }
      else if (e.key === "ArrowLeft") { skip(-5); revealControls(); }
      else if (e.key === "f") toggleFullscreen();
      else if (e.key === "m") toggleMute();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [togglePlay, revealControls, duration]);

  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <div
      ref={containerRef}
      className={cn(
        "group relative select-none overflow-hidden bg-black",
        fullscreen
          ? "flex h-screen w-screen items-center justify-center rounded-none"
          : cn("rounded-lg", className)
      )}
      onMouseMove={revealControls}
      onMouseLeave={() => playing && setShowControls(false)}
    >
      <video
        ref={videoRef}
        className={cn("bg-black object-contain", fullscreen ? "max-h-full max-w-full" : "aspect-video w-full")}
        autoPlay={autoPlay}
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => {
          setCurrentTime(e.currentTarget.currentTime);
          const b = e.currentTarget.buffered;
          if (b.length) setBuffered(b.end(b.length - 1));
        }}
        onPlay={() => { setPlaying(true); setEnded(false); revealControls(); }}
        onPause={() => { setPlaying(false); setShowControls(true); }}
        onWaiting={() => setWaiting(true)}
        onPlaying={() => setWaiting(false)}
        onCanPlay={() => setWaiting(false)}
        onEnded={() => { setPlaying(false); setEnded(true); setShowControls(true); onComplete?.(); }}
        onError={() => setError(true)}
        playsInline
      />

      {/* Vídeo em processamento / indisponível */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 px-6 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-white/80" />
          <div>
            <p className="text-sm font-semibold text-white">Vídeo em processamento</p>
            <p className="mt-1 text-xs text-white/60">O envio foi concluído, mas o vídeo ainda está sendo convertido. Aguarde alguns minutos e recarregue a página.</p>
          </div>
          <button
            onClick={() => { setError(false); setWaiting(true); videoRef.current?.load(); }}
            className="mt-1 rounded-md border border-white/20 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Loading spinner */}
      {waiting && !ended && !error && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Loader2 className="h-10 w-10 text-white/80 animate-spin" />
        </div>
      )}

      {/* Center play / replay button */}
      {!playing && !waiting && !error && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center group/center"
          aria-label={ended ? "Reproduzir novamente" : "Reproduzir"}
        >
          <span className="h-16 w-16 rounded-full bg-primary/90 backdrop-blur-sm flex items-center justify-center shadow-2xl transition-transform group-hover/center:scale-110">
            {ended ? <RotateCcw className="h-7 w-7 text-white" /> : <Play className="h-8 w-8 text-white ml-1" />}
          </span>
        </button>
      )}

      {/* Watermark */}
      {watermark && (
        <div className="absolute top-3 right-4 text-white/30 text-xs font-semibold tracking-wide pointer-events-none">
          {watermark}
        </div>
      )}

      {/* Gradient + controls */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pt-10 px-3 pb-2 transition-opacity duration-300",
          showControls || !playing ? "opacity-100" : "opacity-0"
        )}
      >
        {/* Seek bar */}
        <SeekBar progress={progress} buffered={bufferedPct} onSeek={seekTo} />

        {/* Time under bar (mobile-friendly) */}
        <div className="flex items-center gap-1 mt-1">
          <button onClick={togglePlay} className="p-1.5 text-white hover:text-primary transition-colors" aria-label="Play/Pause">
            {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </button>
          <button onClick={() => skip(-10)} className="hidden p-1.5 text-white/80 transition-colors hover:text-white sm:inline-flex" aria-label="Voltar 10s">
            <SkipBack className="h-4 w-4" />
          </button>
          <button onClick={() => skip(10)} className="hidden p-1.5 text-white/80 transition-colors hover:text-white sm:inline-flex" aria-label="Avançar 10s">
            <SkipForward className="h-4 w-4" />
          </button>

          {/* Volume */}
          <div className="flex items-center group/vol">
            <button onClick={toggleMute} className="p-1.5 text-white/80 hover:text-white transition-colors" aria-label="Volume">
              <VolumeIcon className="h-4 w-4" />
            </button>
            <input
              type="range" min={0} max={1} step={0.05}
              value={muted ? 0 : volume}
              onChange={(e) => changeVolume(Number(e.target.value))}
              className="ml-0 h-1 w-0 cursor-pointer opacity-0 accent-primary transition-all duration-200 group-hover/vol:ml-1 group-hover/vol:w-16 group-hover/vol:opacity-100"
              aria-label="Ajustar volume"
            />
          </div>

          <span className="text-white/80 text-xs font-mono ml-1 tabular-nums">
            {formatDuration(Math.floor(currentTime))} / {formatDuration(Math.floor(duration))}
          </span>

          <div className="flex-1" />

          {/* Speed */}
          <div className="relative">
            <button
              onClick={() => setShowSpeedMenu((s) => !s)}
              className="px-2 py-1 text-white/90 hover:text-white text-xs font-semibold rounded bg-white/10 hover:bg-white/20 transition-colors"
            >
              {speed}×
            </button>
            {showSpeedMenu && (
              <div className="absolute bottom-full right-0 mb-2 bg-card border border-border rounded-lg shadow-xl py-1 z-20 min-w-[72px]">
                {SPEEDS.map((s) => (
                  <button
                    key={s}
                    onClick={() => changeSpeed(s)}
                    className={cn("block w-full px-3 py-1.5 text-xs text-left hover:bg-muted transition-colors", s === speed ? "text-primary font-semibold" : "text-foreground")}
                  >
                    {s}×
                  </button>
                ))}
              </div>
            )}
          </div>

          <button onClick={togglePiP} className="p-1.5 text-white/80 hover:text-white transition-colors hidden sm:block" aria-label="Picture-in-Picture">
            <PictureInPicture className="h-4 w-4" />
          </button>
          <button onClick={toggleFullscreen} className="p-1.5 text-white/80 hover:text-white transition-colors" aria-label="Tela cheia">
            {fullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

function SeekBar({ progress, buffered, onSeek }: { progress: number; buffered: number; onSeek: (pct: number) => void }) {
  const barRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [hoverPct, setHoverPct] = useState<number | null>(null);

  const pctFromEvent = (clientX: number) => {
    const rect = barRef.current!.getBoundingClientRect();
    return Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
  };

  useEffect(() => {
    if (!dragging) return;
    const move = (e: MouseEvent) => onSeek(pctFromEvent(e.clientX));
    const touchMove = (e: TouchEvent) => {
      if (e.touches[0]) { e.preventDefault(); onSeek(pctFromEvent(e.touches[0].clientX)); }
    };
    const up = () => setDragging(false);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    window.addEventListener("touchmove", touchMove, { passive: false });
    window.addEventListener("touchend", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchmove", touchMove);
      window.removeEventListener("touchend", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging]);

  const display = hoverPct !== null ? hoverPct * 100 : progress;

  return (
    <div
      ref={barRef}
      className="group/seek relative flex h-5 cursor-pointer touch-none items-center"
      onMouseDown={(e) => { setDragging(true); onSeek(pctFromEvent(e.clientX)); }}
      onMouseMove={(e) => setHoverPct(pctFromEvent(e.clientX))}
      onMouseLeave={() => setHoverPct(null)}
      onTouchStart={(e) => { if (e.touches[0]) { setDragging(true); onSeek(pctFromEvent(e.touches[0].clientX)); } }}
    >
      <div className="relative h-1 w-full rounded-full bg-white/25 group-hover/seek:h-1.5 transition-all">
        {/* buffered */}
        <div className="absolute inset-y-0 left-0 rounded-full bg-white/30" style={{ width: `${buffered}%` }} />
        {/* played */}
        <div className="absolute inset-y-0 left-0 rounded-full bg-primary" style={{ width: `${display}%` }} />
        {/* handle */}
        <div
          className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow transition-opacity sm:h-3 sm:w-3 sm:opacity-0 sm:group-hover/seek:opacity-100"
          style={{ left: `${display}%` }}
        />
      </div>
    </div>
  );
}

function MockVideoPlayer({ watermark, onComplete, className }: VideoPlayerProps) {
  const [playing, setPlaying] = useState(false);

  return (
    <div className={cn("relative bg-black rounded-lg overflow-hidden select-none", className)}>
      <div className="aspect-video w-full bg-black/90 flex items-center justify-center cursor-pointer" onClick={() => { setPlaying((p) => !p); if (!playing) onComplete?.(); }}>
        <div className="flex flex-col items-center gap-2">
          <div className="h-16 w-16 rounded-full bg-white/10 flex items-center justify-center">
            {playing ? <Pause className="h-7 w-7 text-white" /> : <Play className="h-7 w-7 text-white ml-1" />}
          </div>
          <span className="text-white/50 text-xs">Nenhum vídeo enviado para esta aula.</span>
        </div>
      </div>
      {watermark && <div className="absolute top-3 right-4 text-white/25 text-xs font-medium pointer-events-none">{watermark}</div>}
    </div>
  );
}
