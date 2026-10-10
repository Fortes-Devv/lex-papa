// Liberação programada: conteúdo abre X dias depois da compra (matrícula).
// - curso.pdfReleaseDays: PDFs/materiais (evita "baixa tudo e pede reembolso" na garantia de 7 dias);
// - courseModule.releaseAfterDays: o módulo inteiro (aulas e PDFs);
// - lesson.dripDays: a aula;
// - seção Mentoria: tudo abre MENTORIA_RELEASE_DAYS após a compra.

export const MENTORIA_RELEASE_DAYS = 7;

// Prazo mínimo da seção do curso em que o módulo está.
export const sectionReleaseDays = (section: string) => (section === "mentoria" ? MENTORIA_RELEASE_DAYS : 0);

const DAY = 24 * 60 * 60 * 1000;

export function releaseAt(enrolledAt: Date, days: number): Date | null {
  return days > 0 ? new Date(enrolledAt.getTime() + days * DAY) : null;
}

// null = já liberado; Date = quando libera.
export function lockedUntil(enrolledAt: Date | null | undefined, days: number, now = new Date()): Date | null {
  if (!enrolledAt || days <= 0) return null;
  const at = new Date(enrolledAt.getTime() + days * DAY);
  return at > now ? at : null;
}

export const releaseLabel = (d: Date) =>
  d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Fortaleza" });
