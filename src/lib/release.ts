// Liberação programada: conteúdo abre X dias depois da compra (matrícula).
// - curso.pdfReleaseDays: PDFs/materiais (evita "baixa tudo e pede reembolso" na garantia de 7 dias);
// - courseModule.releaseAfterDays: o módulo inteiro (aulas e PDFs).

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
