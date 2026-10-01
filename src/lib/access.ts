import type { Enrollment } from "@prisma/client";

export const STAFF_ROLES = ["admin", "moderator", "teacher"] as const;

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
