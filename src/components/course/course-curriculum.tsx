"use client";
import { useState } from "react";
import { Play, Lock, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDuration, cn } from "@/lib/utils/cn";

interface CurriculumLesson {
  id: string;
  title: string;
  isFree: boolean;
  duration: number | null;
}
interface CurriculumModule {
  id: string;
  title: string;
  lessons: CurriculumLesson[];
}

export function CourseCurriculum({ modules }: { modules: CurriculumModule[] }) {
  const [expandedMod, setExpandedMod] = useState<string | null>(modules[0]?.id ?? null);

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      {modules.map((mod) => (
        <div key={mod.id}>
          <button
            className="flex w-full items-center justify-between px-4 py-3 bg-muted/30 border-b border-border hover:bg-muted/60 transition-colors text-left"
            onClick={() => setExpandedMod(expandedMod === mod.id ? null : mod.id)}
          >
            <div className="flex items-center gap-2">
              <ChevronDown className={cn("h-4 w-4 text-foreground-muted transition-transform", expandedMod !== mod.id && "-rotate-90")} />
              <span className="text-sm font-semibold text-foreground">{mod.title}</span>
            </div>
            <span className="text-xs text-foreground-muted">{mod.lessons.length} aulas</span>
          </button>
          {expandedMod === mod.id && (
            <div className="divide-y divide-border">
              {mod.lessons.map((lesson) => (
                <div key={lesson.id} className="flex items-center gap-3 px-4 py-2.5">
                  {lesson.isFree ? <Play className="h-3.5 w-3.5 text-primary shrink-0" /> : <Lock className="h-3.5 w-3.5 text-foreground-subtle shrink-0" />}
                  <span className={cn("flex-1 text-sm", lesson.isFree ? "text-primary" : "text-foreground")}>{lesson.title}</span>
                  {lesson.isFree && <Badge variant="success" className="text-2xs">Grátis</Badge>}
                  {lesson.duration ? <span className="text-xs text-foreground-muted">{formatDuration(lesson.duration)}</span> : null}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
      {modules.length === 0 && (
        <div className="py-8 text-center text-sm text-foreground-muted">Conteúdo em breve.</div>
      )}
    </div>
  );
}
