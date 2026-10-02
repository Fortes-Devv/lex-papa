import { beforeEach, describe, expect, it, vi } from "vitest";

const hits = vi.hoisted(() => [] as { key: string; createdAt: Date }[]);
const db = vi.hoisted(() => ({
  rateLimitHit: {
    count: vi.fn(async ({ where }: { where: { key: string; createdAt: { gte: Date } } }) =>
      hits.filter((h) => h.key === where.key && h.createdAt >= where.createdAt.gte).length),
    create: vi.fn(async ({ data }: { data: { key: string } }) => { hits.push({ key: data.key, createdAt: new Date() }); }),
    deleteMany: vi.fn(async () => ({ count: 0 })),
  },
}));
vi.mock("@/lib/db", () => ({ db }));
vi.mock("next/headers", () => ({ headers: vi.fn() }));

import { clientIpFrom, hitRateLimit, normalizeEmail } from "./rate-limit";

beforeEach(() => { hits.length = 0; });

describe("hitRateLimit (F0-9)", () => {
  it("libera até o limite e bloqueia a partir dele", async () => {
    const results = [];
    for (let i = 0; i < 6; i++) results.push((await hitRateLimit("login:email:a@b.com", 5, 900)).allowed);
    expect(results).toEqual([true, true, true, true, true, false]);
  });

  it("chaves diferentes têm contadores separados", async () => {
    for (let i = 0; i < 5; i++) await hitRateLimit("login:email:a@b.com", 5, 900);
    expect((await hitRateLimit("login:email:outro@b.com", 5, 900)).allowed).toBe(true);
  });

  it("tentativas fora da janela não contam", async () => {
    for (let i = 0; i < 5; i++) hits.push({ key: "k", createdAt: new Date(Date.now() - 20 * 60_000) });
    expect((await hitRateLimit("k", 5, 15 * 60)).allowed).toBe(true);
  });

  it("se o banco falhar, libera (fail-open) em vez de travar o login", async () => {
    db.rateLimitHit.count.mockRejectedValueOnce(new Error("db fora"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await hitRateLimit("k", 1, 60)).allowed).toBe(true);
    spy.mockRestore();
  });
});

describe("helpers", () => {
  it("IP vem do primeiro valor de x-forwarded-for", () => {
    expect(clientIpFrom(new Headers({ "x-forwarded-for": "200.1.1.1, 10.0.0.1" }))).toBe("200.1.1.1");
    expect(clientIpFrom(new Headers())).toBe("unknown");
  });

  it("normaliza e-mail", () => {
    expect(normalizeEmail("  Fulano@Email.COM ")).toBe("fulano@email.com");
  });
});
