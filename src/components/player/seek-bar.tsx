"use client";
import { useEffect, useRef, useState } from "react";

// Barra de tempo dos players (arrastar com mouse ou dedo; prévia ao passar o mouse).
export function SeekBar({ progress, buffered, onSeek }: { progress: number; buffered: number; onSeek: (pct: number) => void }) {
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
