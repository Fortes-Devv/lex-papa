import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  product: { findUnique: vi.fn() },
  coupon: { findUnique: vi.fn() },
}));
vi.mock("@/lib/db", () => ({ db }));

import { computeOrderTotal } from "./pricing";

const product = { id: "p1", price: 200, status: "published" };
const coupon = (over: Record<string, unknown> = {}) => ({
  code: "LEX10", type: "percentage", value: 10, isActive: true, expiresAt: null, maxUses: null, usedCount: 0, minOrderValue: null, ...over,
});

describe("computeOrderTotal", () => {
  beforeEach(() => {
    db.product.findUnique.mockResolvedValue(product);
  });

  it("sem cupom cobra o preço cheio", async () => {
    const r = await computeOrderTotal("p1");
    expect(r).toMatchObject({ subtotal: 200, discount: 0, total: 200, coupon: null });
  });

  it("recusa produto não publicado (F1-4)", async () => {
    db.product.findUnique.mockResolvedValue({ ...product, status: "draft" });
    await expect(computeOrderTotal("p1")).rejects.toThrow("não está disponível");
  });

  it("recusa produto inexistente", async () => {
    db.product.findUnique.mockResolvedValue(null);
    await expect(computeOrderTotal("x")).rejects.toThrow("Produto não encontrado");
  });

  it("aplica cupom percentual e busca o código em maiúsculas", async () => {
    db.coupon.findUnique.mockResolvedValue(coupon());
    const r = await computeOrderTotal("p1", "lex10");
    expect(db.coupon.findUnique).toHaveBeenCalledWith({ where: { code: "LEX10" } });
    expect(r).toMatchObject({ discount: 20, total: 180, coupon: { code: "LEX10" } });
  });

  it("aplica cupom de valor fixo", async () => {
    db.coupon.findUnique.mockResolvedValue(coupon({ type: "fixed", value: 50 }));
    expect((await computeOrderTotal("p1", "X")).total).toBe(150);
  });

  it("cupom de 100% (ou maior que o preço) zera o total, nunca negativo (F1-3)", async () => {
    db.coupon.findUnique.mockResolvedValue(coupon({ type: "fixed", value: 999 }));
    const r = await computeOrderTotal("p1", "X");
    expect(r).toMatchObject({ discount: 200, total: 0 });
  });

  it.each([
    ["inexistente", null, "Cupom inválido"],
    ["inativo", coupon({ isActive: false }), "Cupom inativo"],
    ["expirado", coupon({ expiresAt: new Date(Date.now() - 1000) }), "Cupom expirado"],
    ["esgotado", coupon({ maxUses: 5, usedCount: 5 }), "Cupom esgotado"],
    ["abaixo do mínimo", coupon({ minOrderValue: 300 }), "acima de R$ 300.00"],
  ])("recusa cupom %s", async (_nome, value, msg) => {
    db.coupon.findUnique.mockResolvedValue(value);
    await expect(computeOrderTotal("p1", "X")).rejects.toThrow(msg);
  });
});
