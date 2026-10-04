import type { Enrollment } from "@prisma/client";

// Professor não entra mais na plataforma (só crédito nos módulos): não é equipe.
export const STAFF_ROLES = ["admin", "moderator"] as const;

export function isStaffRole(role: string | undefined | null): boolean {
  return !!role && (STAFF_ROLES as readonly string[]).includes(role);
}

// Matrícula só libera conteúdo se estiver ativa/concluída e não tiver expirado.
export function isEnrollmentActive(enrollment: Pick<Enrollment, "status" | "expiresAt"> | null | undefined): boolean {
  if (!enrollment) return false;
  if (enrollment.status !== "active" && enrollment.status !== "completed") return false;
  if (enrollment.expiresAt && enrollment.expiresAt.getTime() < Date.now()) return false;
  return true;
}
