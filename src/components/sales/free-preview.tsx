"use client";
import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";
import { VideoPlayer } from "@/components/player/video-player";
import { CdnImg } from "@/components/ui/cdn-img";
import { formatDuration } from "@/lib/utils/cn";

export interface FreeLesson { id: string; title: string; discipline: string; duration: number | null; src: string }

// Evento disparado pela lista de conteúdo ("Assistir" numa aula grátis).
export const PLAY_FREE_EVENT = "lex:play-free";

// Aula grátis na página de venda: assiste sem cadastro. Sem aula grátis, mostra só a capa.
export function FreePreview({ cover, title, lessons }: { cover: string; title: string; lessons: FreeLesson[] }) {
  const [currentId, setCurrentId] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const current = lessons.find((l) => l.id === currentId) ?? null;
  const first = lessons[0];

  useEffect(() => {
    const onPlay = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (!lessons.some((l) => l.id === id)) return;
      setCurrentId(id);
      boxRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    };
    window.addEventListener(PLAY_FREE_EVENT, onPlay);
    return () => window.removeEventListener(PLAY_FREE_EVENT, onPlay);
  }, [lessons]);

  return (
    <div ref={boxRef} className="overflow-hidden rounded-[14px] bg-black">
      {current ? (
        <VideoPlayer key={current.id} src={current.src} title={current.title} watermark="LEX Concursos" autoPlay className="w-full" />
      ) : (
        <button type="button" disabled={!first} onClick={() => first && setCurrentId(first.id)} className="group relative block aspect-video w-full disabled:cursor-default" aria-label={first ? `Assistir aula grátis: ${first.title}` : title}>
          <CdnImg src={cover} width={960} loading="eager" alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" />
          {first && (
            <>
              <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <span className="absolute left-1/2 top-1/2 grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-brand shadow-xl transition-transform group-hover:scale-105">
                <Play className="ml-0.5 h-7 w-7 fill-white text-white" />
              </span>
              <span className="absolute bottom-3 left-4 right-4 text-left text-white">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-brand">Aula grátis · {first.discipline}</span>
                <span className="block truncate text-sm font-semibold">{first.title}</span>
                <span className="block text-xs text-white/70">Assista sem cadastro{first.duration ? ` · ${formatDuration(first.duration)}` : ""}</span>
              </span>
            </>
          )}
        </button>
      )}
      {current && (
        <p className="truncate bg-navy px-4 py-2.5 text-xs text-white/80">
          <span className="font-bold uppercase tracking-wider text-brand">Aula grátis</span> · {current.title}
        </p>
      )}
    </div>
  );
}
