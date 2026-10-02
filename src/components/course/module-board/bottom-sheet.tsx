"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils/cn";

// Folha que sobe do rodapé (celular/tablet). Arraste o puxador para baixo para fechar.
export function BottomSheet({ open, onClose, children, className, label }: { open: boolean; onClose: () => void; children: React.ReactNode; className?: string; label: string }) {
  const [dragY, setDragY] = useState(0);
  const startY = useRef<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);

  useEffect(() => { if (!open) setDragY(0); }, [open]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true" aria-label={label}>
      <div className="absolute inset-0 bg-[rgba(15,22,32,.55)]" onClick={onClose} />
      <div
        className={cn("absolute inset-x-0 bottom-0 flex flex-col rounded-t-2xl bg-card shadow-2xl", className)}
        style={{ transform: `translateY(${dragY}px)`, transition: startY.current === null ? "transform .2s ease-out" : undefined }}
      >
        <div
          className="flex shrink-0 touch-none justify-center py-2.5"
          onPointerDown={(e) => { startY.current = e.clientY; (e.target as HTMLElement).setPointerCapture(e.pointerId); }}
          onPointerMove={(e) => { if (startY.current !== null) setDragY(Math.max(0, e.clientY - startY.current)); }}
          onPointerUp={() => { const y = dragY; startY.current = null; if (y > 120) onClose(); else setDragY(0); }}
        >
          <span className="h-1 w-10 rounded-full bg-border" aria-hidden />
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
