import { describe, it, expect, vi, beforeEach } from "vitest";

const created = vi.hoisted(() => [] as Array<{ action: string; metadata: { error: string; path?: string } }>);
const seen = vi.hoisted(() => new Set<string>());
vi.mock("@/lib/db", () => ({ db: { auditLog: { create: vi.fn(async ({ data }) => { created.push(data); }) } } }));
vi.mock("@/lib/rate-limit", () => ({
  hitRateLimit: vi.fn(async (key: string) => { if (seen.has(key)) return { allowed: false }; seen.add(key); return { allowed: true }; }),
}));
import { reportError } from "./error-report";

describe("reportError", () => {
  beforeEach(() => { created.length = 0; seen.clear(); });

  it("grava erro do servidor nos logs", async () => {
    await reportError({ kind: "server", message: "boom", path: "/student/course" });
    expect(created).toHaveLength(1);
    expect(created[0].action).toBe("system.server_error");
    expect(created[0].metadata).toMatchObject({ error: "boom", path: "/student/course" });
  });
  it("o mesmo erro repetido é gravado uma vez só", async () => {
    for (let i = 0; i < 5; i++) await reportError({ kind: "client", message: "x is undefined", path: "/a" });
    await reportError({ kind: "client", message: "x is undefined", path: "/b" });
    expect(created.map((c) => c.metadata.path)).toEqual(["/a", "/b"]);
  });
  it("corta mensagens enormes", async () => {
    await reportError({ kind: "server", message: "a".repeat(5000) });
    expect(created[0].metadata.error).toHaveLength(500);
  });
});
