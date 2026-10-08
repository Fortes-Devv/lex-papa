import { describe, it, expect } from "vitest";
import { lockedUntil } from "./release";

describe("lockedUntil", () => {
  const bought = new Date("2026-10-07T12:00:00Z");
  it("0 dias = liberado na hora", () => expect(lockedUntil(bought, 0, bought)).toBeNull());
  it("7 dias: bloqueado antes, liberado depois", () => {
    expect(lockedUntil(bought, 7, new Date("2026-10-10T12:00:00Z"))?.toISOString()).toBe("2026-10-14T12:00:00.000Z");
    expect(lockedUntil(bought, 7, new Date("2026-10-14T12:00:01Z"))).toBeNull();
  });
  it("sem matrícula não calcula", () => expect(lockedUntil(null, 7)).toBeNull());
});
