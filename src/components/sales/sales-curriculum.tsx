"use client";
import { useState } from "react";
import { ChevronDown, Lock, FileText } from "lucide-react";
import { cn, formatDuration } from "@/lib/utils/cn";

export interface SalesLesson { id: string; title: string; duration: number | null; isPdf: boolean }
export interface SalesDiscipline { key: string; name: string; instructorName: string | null; initials: string; lessons: SalesLesson[]; seconds: number; pdfs: number }

const PREVIEW = 3; // aulas mostradas antes de "+ N aulas"

// Conteúdo da página de venda, por disciplina (aulas e PDFs juntos). Tudo é exclusivo para alunos.
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
          const numbered = d.lessons.map((l, n) => ({ ...l, n: n + 1 }));
          const lessons = showAll ? numbered : numbered.slice(0, PREVIEW);
          const videos = d.lessons.length - d.pdfs;
          return (
            <div key={d.key} className="border-b border-line-soft last:border-0 dark:border-white/10">
              <button type="button" aria-expanded={isOpen} onClick={() => setOpen((o) => (isOpen ? o.filter((k) => k !== d.key) : [...o, d.key]))}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-background">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-navy text-sm font-extrabold text-brand">{d.initials}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-[15px] font-bold text-foreground">{d.name}</span>
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
                  {lessons.map((l) => (
                    <li key={l.id} className="flex items-center gap-3 px-4 py-2.5 pl-[68px] text-sm">
                      <span className="min-w-0 flex-1 truncate text-foreground">{l.n}. {l.title}</span>
                      {l.duration ? <span className="shrink-0 text-xs text-foreground-muted">{formatDuration(l.duration)}</span> : null}
                      {l.isPdf ? (
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
