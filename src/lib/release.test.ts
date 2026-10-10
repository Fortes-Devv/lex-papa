import { describe, it, expect } from "vitest";
import { MENTORIA_RELEASE_DAYS, lockedUntil, sectionReleaseDays } from "./release";

describe("lockedUntil", () => {
  const bought = new Date("2026-10-07T12:00:00Z");
  it("0 dias = liberado na hora", () => expect(lockedUntil(bought, 0, bought)).toBeNull());
  it("7 dias: bloqueado antes, liberado depois", () => {
    expect(lockedUntil(bought, 7, new Date("2026-10-10T12:00:00Z"))?.toISOString()).toBe("2026-10-14T12:00:00.000Z");
    expect(lockedUntil(bought, 7, new Date("2026-10-14T12:00:01Z"))).toBeNull();
  });
  it("sem matrícula não calcula", () => expect(lockedUntil(null, 7)).toBeNull());
});

describe("sectionReleaseDays", () => {
  it("Mentoria abre 7 dias após a compra; Aulas e Materiais, na hora", () => {
    expect(sectionReleaseDays("mentoria")).toBe(MENTORIA_RELEASE_DAYS);
    expect(MENTORIA_RELEASE_DAYS).toBe(7);
    expect(sectionReleaseDays("aulas")).toBe(0);
  });
});
