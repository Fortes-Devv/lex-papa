"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils/cn";

export type DropdownItem =
  | { separator: true; label?: never; icon?: never; onClick?: never; href?: never; variant?: never; disabled?: never }
  | { separator?: false; label: string; icon?: React.ReactNode; onClick?: () => void; href?: string; variant?: "default" | "destructive"; disabled?: boolean };

interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  align?: "left" | "right";
  className?: string;
}

// O menu abre num portal (fixo na tela): não é cortado por caixas com rolagem
// (ex.: painel de preview) e abre para cima quando falta espaço embaixo.
export function Dropdown({ trigger, items, align = "right", className }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; up: boolean } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Posição a partir do botão; mede o menu para decidir se abre para cima.
  useLayoutEffect(() => {
    if (!open || !ref.current) { setPos(null); return; }
    const place = () => {
      const r = ref.current!.getBoundingClientRect();
      const menuH = menuRef.current?.offsetHeight ?? 0;
      const menuW = menuRef.current?.offsetWidth ?? 180;
      const up = r.bottom + 6 + menuH > window.innerHeight - 8 && r.top - 6 - menuH > 8;
      const rawLeft = align === "right" ? r.right - menuW : r.left;
      const left = Math.min(Math.max(8, rawLeft), window.innerWidth - menuW - 8);
      setPos({ top: up ? r.top - 6 - menuH : r.bottom + 6, left, up });
    };
    place();
    requestAnimationFrame(place); // segunda medida, já com o menu renderizado
  }, [open, align]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!ref.current?.contains(t) && !menuRef.current?.contains(t)) setOpen(false);
    };
    // Rolar ou redimensionar fecha o menu (senão ele ficaria "solto" na tela).
    const onScroll = (e: Event) => { if (!menuRef.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const menu = open && (
    <div
      ref={menuRef}
      role="menu"
      style={{ position: "fixed", top: pos?.top ?? -9999, left: pos?.left ?? -9999, visibility: pos ? "visible" : "hidden" }}
      className="z-[1300] min-w-[180px] rounded-lg border border-border bg-popover py-1 shadow-lg animate-slide-in-down"
    >
      {items.map((item, i) => (
        item.separator ? (
          <div key={i} className="my-1 border-t border-border" />
        ) : item.href ? (
          <a
            key={i}
            href={item.href}
            role="menuitem"
            onClick={() => setOpen(false)}
            className={cn(
              "flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors duration-100 hover:bg-muted",
              item.variant === "destructive" ? "text-destructive" : "text-foreground"
            )}
          >
            {item.icon && <span className="text-foreground-muted">{item.icon}</span>}
            {item.label}
          </a>
        ) : (
          <button
            key={i}
            role="menuitem"
            disabled={item.disabled}
            onClick={() => { setOpen(false); item.onClick?.(); }}
            className={cn(
              "flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors duration-100",
              "hover:bg-muted disabled:opacity-50 disabled:pointer-events-none",
              item.variant === "destructive" ? "text-destructive" : "text-foreground"
            )}
          >
            {item.icon && <span className="text-foreground-muted">{item.icon}</span>}
            {item.label}
          </button>
        )
      ))}
    </div>
  );

  return (
    <div ref={ref} className={cn("relative inline-block", className)}>
      <div onClick={() => setOpen((o) => !o)}>{trigger}</div>
      {menu && createPortal(menu, document.body)}
    </div>
  );
}
