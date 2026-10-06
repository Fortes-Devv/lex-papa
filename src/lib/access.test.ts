import { describe, expect, it } from "vitest";
import { isEnrollmentActive, isStaffRole } from "./access";

const future = new Date(Date.now() + 86_400_000);
const past = new Date(Date.now() - 86_400_000);

describe("isEnrollmentActive", () => {
  it.each([
    ["sem matrícula", null, false],
    ["ativa sem prazo", { status: "active", expiresAt: null }, true],
    ["concluída", { status: "completed", expiresAt: null }, true],
    ["ativa dentro do prazo", { status: "active", expiresAt: future }, true],
    ["ativa vencida", { status: "active", expiresAt: past }, false],
    ["cancelada", { status: "cancelled", expiresAt: null }, false],
    ["expirada", { status: "expired", expiresAt: null }, false],
  ] as const)("%s → %s", (_nome, enrollment, expected) => {
    expect(isEnrollmentActive(enrollment as never)).toBe(expected);
  });
});

describe("isStaffRole", () => {
  it("admin, moderador e professor são equipe; aluno não", () => {
    expect(["admin", "moderator"].every(isStaffRole)).toBe(true);
    expect(isStaffRole("teacher")).toBe(false);
    expect(isStaffRole("student")).toBe(false);
    expect(isStaffRole(undefined)).toBe(false);
  });
});

describe("accessExpiresAt", () => {
  it("vale 1 ano (365 dias) a partir da compra", async () => {
    const { accessExpiresAt, isEnrollmentActive } = await import("./access");
    const bought = new Date("2026-10-05T12:00:00Z");
    expect(accessExpiresAt(bought).toISOString()).toBe("2027-10-05T12:00:00.000Z");
    expect(isEnrollmentActive({ status: "active", expiresAt: accessExpiresAt() })).toBe(true);
    expect(isEnrollmentActive({ status: "active", expiresAt: new Date(Date.now() - 1000) })).toBe(false);
  });
});
