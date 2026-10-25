"use client";
import { useEffect, useRef, useState } from "react";

// Marca-d'água do aluno sobre o vídeo: nome + código da conta + data e hora. Fica só nos
// cantos (nunca no meio, para não atrapalhar a aula) e troca de canto a cada `everyMs`,
// sorteando um canto diferente do atual. Serve para rastrear quem gravou a tela; não
// impede a gravação. Se alguém esconder ou apagar a marca pelas ferramentas do
// navegador, `onTamper` avisa o player, que pausa o vídeo.

const stamp = () =>
  new Date().toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Fortaleza" }).replace(",", "");

type Corner = 0 | 1 | 2 | 3; // superior esquerdo, superior direito, inferior esquerdo, inferior direito

// Posição do canto, com uma pequena variação para não ficar sempre no mesmo ponto.
// Os de baixo ficam acima da barra de controles.
function cornerStyle(c: Corner): React.CSSProperties {
  const jitter = () => `${3 + Math.random() * 4}%`;
  const vertical = c < 2 ? { top: `${12 + Math.random() * 6}%` } : { bottom: `${17 + Math.random() * 6}%` };
  const horizontal = c % 2 === 0 ? { left: jitter() } : { right: jitter() };
  return { ...vertical, ...horizontal };
}

function nextCorner(current: Corner | null): Corner {
  const options = ([0, 1, 2, 3] as Corner[]).filter((c) => c !== current);
  return options[Math.floor(Math.random() * options.length)];
}

export function MovingWatermark({ text, everyMs = 20_000, onTamper }: { text: string; everyMs?: number; onTamper?: (tampered: boolean) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  // Começa num canto fixo (igual no servidor e no navegador) e sorteia depois de montar.
  const [corner, setCorner] = useState<Corner>(1);
  const [style, setStyle] = useState<React.CSSProperties>({ top: "14%", right: "4%" });
  const [visible, setVisible] = useState(true);
  // true só com a marca totalmente visível (fora do sumir/reaparecer da troca de canto).
  const settledRef = useRef(true);
  const generation = useRef(0); // cada troca de canto conta uma
  const [time, setTime] = useState("");
  const tamperRef = useRef(onTamper);
  tamperRef.current = onTamper;

  useEffect(() => {
    const c = nextCorner(null);
    setCorner(c);
    setStyle(cornerStyle(c));
    setTime(stamp());
  }, []);

  // Troca de canto: some, muda de lugar e reaparece.
  useEffect(() => {
    let fade: ReturnType<typeof setTimeout>;
    let settle: ReturnType<typeof setTimeout>;
    const t = setInterval(() => {
      const gen = ++generation.current;
      settledRef.current = false;
      setVisible(false);
      fade = setTimeout(() => {
        setCorner((c) => {
          const n = nextCorner(c);
          setStyle(cornerStyle(n));
          return n;
        });
        setTime(stamp());
        setVisible(true);
        // Só vale se nenhuma troca nova começou nesse meio-tempo.
        settle = setTimeout(() => { if (generation.current === gen) settledRef.current = true; }, 900);
      }, 600);
    }, everyMs);
    return () => { clearInterval(t); clearTimeout(fade); clearTimeout(settle); };
  }, [everyMs]);

  // Conferência a cada 2 s: a marca precisa estar na página e visível (o sumiço
  // proposital da troca de canto dura menos de 1 s e não conta).
  useEffect(() => {
    let last = false;
    const check = () => {
      const el = ref.current;
      let hidden = !el || !el.isConnected;
      if (el && !hidden) {
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        hidden = cs.display === "none" || cs.visibility === "hidden" || r.width < 20 || r.height < 6
          || (settledRef.current && Number(cs.opacity) < 0.15);
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
      data-corner={corner}
      className="pointer-events-none absolute z-[25] select-none whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-semibold tracking-wide text-white/60 transition-opacity duration-500 motion-reduce:transition-none sm:text-xs"
      style={{ ...style, opacity: visible ? 1 : 0, textShadow: "0 0 3px rgba(0,0,0,.85), 0 1px 2px rgba(0,0,0,.7)" }}
    >
      {text}{time ? ` · ${time}` : ""}
    </div>
  );
}
