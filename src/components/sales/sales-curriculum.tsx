"use client";
import { useState } from "react";
import { ChevronDown, Lock, Play, FileText } from "lucide-react";
import { cn, formatDuration } from "@/lib/utils/cn";
import { PLAY_FREE_EVENT } from "./free-preview";

export interface SalesLesson { id: string; title: string; duration: number | null; isPdf: boolean; free: boolean; playable: boolean }
export interface SalesDiscipline { key: string; name: string; instructorName: string | null; initials: string; lessons: SalesLesson[]; seconds: number; pdfs: number }

const PREVIEW = 3; // aulas mostradas antes de "+ N aulas"

// Conteúdo da página de venda, por disciplina (aulas e PDFs juntos), com aulas grátis tocáveis.
export function SalesCurriculum({ disciplines }: { disciplines: SalesDiscipline[] }) {
  const [open, setOpen] = useState<string[]>(disciplines[0] ? [disciplines[0].key] : []);
  const [full, setFull] = useState<string[]>([]);
  const allOpen = open.length === disciplines.length;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[19px] font-extrabold text-foreground">Conteúdo · {disciplines.length} disciplina{disciplines.length !== 1 ? "s" : ""}</h2>
        {disciplines.length > 1 && (
          <button type="button" onClick={() => setOpen(allOpen ? [] : disciplines.map((d) => d.key))} className="text-[13px] font-semibold text-brand">
            {allOpen ? "Recolher tudo" : "Expandir tudo"}
          </button>
        )}
      </div>
      <div className="overflow-hidden rounded-[14px] border border-border bg-card">
        {disciplines.map((d) => {
          const isOpen = open.includes(d.key);
          const showAll = full.includes(d.key);
          const lessons = showAll ? d.lessons : d.lessons.slice(0, PREVIEW);
          const videos = d.lessons.length - d.pdfs;
          const hasFree = d.lessons.some((l) => l.free);
          return (
            <div key={d.key} className="border-b border-line-soft last:border-0 dark:border-white/10">
              <button type="button" aria-expanded={isOpen} onClick={() => setOpen((o) => (isOpen ? o.filter((k) => k !== d.key) : [...o, d.key]))}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-background">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-navy text-sm font-extrabold text-brand">{d.initials}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-[15px] font-bold text-foreground">{d.name}</span>
                    {hasFree && <span className="shrink-0 rounded bg-ok-soft px-1.5 py-0.5 text-[10px] font-bold text-ok-text dark:bg-ok/15 dark:text-ok">GRÁTIS</span>}
                  </span>
                  <span className="block truncate text-xs text-foreground-muted">
                    {[d.instructorName ? `Prof. ${d.instructorName.split(" ")[0]}` : null, videos ? `${videos} aula${videos !== 1 ? "s" : ""}` : null,
                      d.pdfs ? `${d.pdfs} PDF${d.pdfs !== 1 ? "s" : ""}` : null, d.seconds ? formatDuration(d.seconds) : null].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <ChevronDown className={cn("h-4 w-4 shrink-0 text-foreground-muted transition-transform", !isOpen && "-rotate-90")} />
              </button>
              {isOpen && (
                <ul className="border-t border-line-soft bg-background/50 dark:border-white/10">
                  {lessons.map((l, i) => (
                    <li key={l.id} className="flex items-center gap-3 px-4 py-2.5 pl-[68px] text-sm">
                      <span className="min-w-0 flex-1 truncate text-foreground">{i + 1}. {l.title}</span>
                      {l.duration ? <span className="shrink-0 text-xs text-foreground-muted">{formatDuration(l.duration)}</span> : null}
                      {l.free && l.playable ? (
                        <button type="button" onClick={() => window.dispatchEvent(new CustomEvent(PLAY_FREE_EVENT, { detail: l.id }))}
                          className="inline-flex shrink-0 items-center gap-1 rounded-md bg-ok-soft px-2 py-1 text-[11px] font-bold text-ok-text dark:bg-ok/15 dark:text-ok">
                          <Play className="h-3 w-3 fill-current" /> Assistir
                        </button>
                      ) : l.isPdf ? (
                        <FileText className="h-4 w-4 shrink-0 text-foreground-muted" aria-label="PDF" />
                      ) : (
                        <Lock className="h-3.5 w-3.5 shrink-0 text-foreground-muted" aria-label="Exclusivo para alunos" />
                      )}
                    </li>
                  ))}
                  {d.lessons.length > PREVIEW && !showAll && (
                    <li>
                      <button type="button" onClick={() => setFull((f) => [...f, d.key])} className="w-full px-4 py-2.5 pl-[68px] text-left text-[13px] font-semibold text-brand">
                        + {d.lessons.length - PREVIEW} aula{d.lessons.length - PREVIEW !== 1 ? "s" : ""}
                      </button>
                    </li>
                  )}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
