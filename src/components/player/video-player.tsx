"use client";
import { useState, useRef, useEffect } from "react";
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  SkipForward, SkipBack, Settings, Subtitles, PictureInPicture
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatDuration } from "@/lib/utils/cn";

interface VideoPlayerProps {
  title?: string;
  watermark?: string;
  onComplete?: () => void;
  className?: string;
}

export function VideoPlayer({ title, watermark, onComplete, className }: VideoPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration] = useState(1230); // mock 20:30
  const [currentTime, setCurrentTime] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const controlsTimer = useRef<NodeJS.Timeout>();

  const speeds = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

  // Simulate progress
  useEffect(() => {
    if (!playing) return;
    const interval = setInterval(() => {
      setCurrentTime((t) => {
        const next = t + speed;
        if (next >= duration) { setPlaying(false); onComplete?.(); return duration; }
        setProgress((next / duration) * 100);
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [playing, speed, duration, onComplete]);

  function handleMouseMove() {
    setShowControls(true);
    clearTimeout(controlsTimer.current);
    if (playing) {
      controlsTimer.current = setTimeout(() => setShowControls(false), 3000);
    }
  }

  return (
    <div
      className={cn("relative bg-black rounded-lg overflow-hidden select-none", className)}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => playing && setShowControls(false)}
    >
      {/* Video area (mock) */}
      <div className="aspect-video w-full bg-black/90 flex items-center justify-center cursor-pointer" onClick={() => setPlaying((p) => !p)}>
        <div className="text-foreground-subtle text-sm flex flex-col items-center gap-2">
          <div className="h-16 w-16 rounded-full bg-white/10 flex items-center justify-center">
            {playing ? <Pause className="h-7 w-7 text-white" /> : <Play className="h-7 w-7 text-white ml-1" />}
          </div>
          {!playing && <span className="text-white/60 text-xs">Clique para reproduzir</span>}
        </div>
      </div>

      {/* Watermark */}
      {watermark && (
        <div className="absolute top-3 right-3 text-white/20 text-xs font-medium pointer-events-none">
          {watermark}
        </div>
      )}

      {/* Controls overlay */}
      <div className={cn("absolute inset-0 flex flex-col justify-end transition-opacity duration-300", showControls ? "opacity-100" : "opacity-0")}>
        <div className="player-controls px-4 pt-8 pb-3 space-y-2">
          {/* Progress bar */}
          <div className="group relative h-1 hover:h-2 transition-all duration-150 bg-white/20 rounded-full cursor-pointer"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const pct = (e.clientX - rect.left) / rect.width;
              setCurrentTime(pct * duration);
              setProgress(pct * 100);
            }}>
            <div className="h-full bg-primary rounded-full" style={{ width: `${progress}%` }} />
            <div className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity" style={{ left: `${progress}%`, transform: "translate(-50%, -50%)" }} />
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-2">
            <button onClick={() => setCurrentTime((t) => Math.max(0, t - 10))} className="text-white/80 hover:text-white transition-colors p-1">
              <SkipBack className="h-4 w-4" />
            </button>
            <button onClick={() => setPlaying((p) => !p)} className="text-white hover:text-white transition-colors p-1">
              {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
            </button>
            <button onClick={() => setCurrentTime((t) => Math.min(duration, t + 10))} className="text-white/80 hover:text-white transition-colors p-1">
              <SkipForward className="h-4 w-4" />
            </button>
            <button onClick={() => setMuted((m) => !m)} className="text-white/80 hover:text-white transition-colors p-1">
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <span className="text-white/70 text-xs font-mono ml-1">
              {formatDuration(currentTime)} / {formatDuration(duration)}
            </span>

            <div className="flex-1" />

            {/* Speed */}
            <div className="relative">
              <button onClick={() => setShowSpeedMenu((s) => !s)} className="text-white/80 hover:text-white transition-colors px-2 py-1 text-xs font-medium rounded bg-white/10 hover:bg-white/20">
                {speed}x
              </button>
              {showSpeedMenu && (
                <div className="absolute bottom-full right-0 mb-1 bg-card border border-border rounded-lg shadow-xl py-1 z-10">
                  {speeds.map((s) => (
                    <button key={s} onClick={() => { setSpeed(s); setShowSpeedMenu(false); }}
                      className={cn("block w-full px-3 py-1.5 text-xs text-left hover:bg-muted transition-colors", s === speed && "text-primary font-semibold")}>
                      {s}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button className="text-white/80 hover:text-white transition-colors p-1">
              <Subtitles className="h-4 w-4" />
            </button>
            <button className="text-white/80 hover:text-white transition-colors p-1">
              <PictureInPicture className="h-4 w-4" />
            </button>
            <button onClick={() => setFullscreen((f) => !f)} className="text-white/80 hover:text-white transition-colors p-1">
              {fullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
