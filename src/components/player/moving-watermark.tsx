"use client";
import { useEffect, useRef, useState } from "react";

// Marca-d'água do aluno sobre o vídeo: nome + código da conta + data e hora, trocando de
// lugar a cada `everyMs`. Serve para rastrear quem gravou a tela; não impede a gravação.
// Se alguém esconder ou apagar a marca pelas ferramentas do navegador, `onTamper` avisa
// o player, que pausa o vídeo e só volta quando a marca reaparece.

const stamp = () =>
  new Date().toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Fortaleza" }).replace(",", "");

function randomSpot() {
  // Longe das bordas e da barra de controles.
  return { top: 10 + Math.random() * 62, left: 6 + Math.random() * 60 };
}

export function MovingWatermark({ text, everyMs = 20_000, onTamper }: { text: string; everyMs?: number; onTamper?: (tampered: boolean) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [spot, setSpot] = useState(randomSpot);
  const [time, setTime] = useState(stamp);
  const tamperRef = useRef(onTamper);
  tamperRef.current = onTamper;

  useEffect(() => {
    const t = setInterval(() => { setSpot(randomSpot()); setTime(stamp()); }, everyMs);
    return () => clearInterval(t);
  }, [everyMs]);

  // Conferência a cada 2 s: a marca precisa estar na página e visível.
  useEffect(() => {
    let last = false;
    const check = () => {
      const el = ref.current;
      let hidden = !el || !el.isConnected;
      if (el && !hidden) {
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        hidden = cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) < 0.15 || r.width < 20 || r.height < 6;
      }
      if (hidden !== last) { last = hidden; tamperRef.current?.(hidden); }
    };
    const t = setInterval(check, 2000);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute z-[25] select-none whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-semibold tracking-wide text-white/60 transition-[top,left] duration-[1500ms] ease-in-out motion-reduce:transition-none sm:text-xs"
      style={{ top: `${spot.top}%`, left: `${spot.left}%`, textShadow: "0 0 3px rgba(0,0,0,.85), 0 1px 2px rgba(0,0,0,.7)" }}
    >
      {text} · {time}
    </div>
  );
}
