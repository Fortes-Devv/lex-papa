import type { EditorLesson, EditorModule } from "./types";
import { subjectInitials } from "@/lib/discipline";

export type ModuleKind = "aula" | "pdf";

const isPdfLesson = (l: EditorLesson) => l.type === "pdf" || (!!l.pdfUrl && !l.previewUrl);

// Módulo "PDF" = tem aulas e todas são material em PDF (sem vídeo).
export function moduleKind(m: EditorModule): ModuleKind {
  return m.lessons.length > 0 && m.lessons.every(isPdfLesson) ? "pdf" : "aula";
}

export const hasPlayableVideo = (m: EditorModule) => m.lessons.some((l) => !!l.previewUrl);

// Capa automática: sigla da matéria (Língua Portuguesa = LP) ou o número do módulo.
export function coverLabel(m: EditorModule, index: number): string {
  return subjectInitials(m.title) || String(index + 1).padStart(2, "0");
}

export const moduleNumber = (index: number) => `MÓDULO ${String(index + 1).padStart(2, "0")}`;

export function formatClock(seconds: number | null | undefined): string {
  if (!seconds) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// Primeira aula para tocar no preview: primeiro vídeo, senão primeiro PDF, senão a primeira.
export function defaultLesson(m: EditorModule): EditorLesson | null {
  return m.lessons.find((l) => l.previewUrl) ?? m.lessons.find(isPdfLesson) ?? m.lessons[0] ?? null;
}

export { isPdfLesson };
