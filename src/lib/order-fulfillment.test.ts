import { beforeEach, describe, expect, it, vi } from "vitest";

// Banco em memória que imita o essencial do Postgres para este fluxo:
// updateMany condicional e transações serializadas (como o lock da linha do pedido).
const state = vi.hoisted(() => ({
  order: null as null | { id: string; userId: string; status: string; total: number; couponCode: string | null; items: { productId: string }[]; [k: string]: unknown },
  enrollments: new Map<string, { status: string }>(),
  enrolledCount: 0,
  couponUsed: 0,
  queue: Promise.resolve() as Promise<unknown>,
}));

const db = vi.hoisted(() => {
  const tick = () => new Promise((r) => setTimeout(r, 1)); // força intercalação entre chamadas
  const api = {
    order: {
      findUnique: vi.fn(async () => (state.order ? structuredClone(state.order) : null)),
      updateMany: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        await tick();
        if (!state.order || state.order.status === "paid") return { count: 0 };
        Object.assign(state.order, data);
        return { count: 1 };
      }),
    },
    enrollment: {
      findUnique: vi.fn(async ({ where }: { where: { userId_productId: { userId: string; productId: string } } }) => {
        const k = `${where.userId_productId.userId}:${where.userId_productId.productId}`;
        return state.enrollments.has(k) ? { id: k } : null;
      }),
      upsert: vi.fn(async ({ where }: { where: { userId_productId: { userId: string; productId: string } } }) => {
        state.enrollments.set(`${where.userId_productId.userId}:${where.userId_productId.productId}`, { status: "active" });
      }),
    },
    product: { update: vi.fn(async () => { state.enrolledCount++; }) },
    coupon: { updateMany: vi.fn(async () => { state.couponUsed++; return { count: 1 }; }) },
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
      const run = state.queue.then(() => fn(api));
      state.queue = run.catch(() => undefined);
      return run;
    }),
  };
  return api;
});

vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/lib/mercadopago", () => ({ getMpOrderClient: vi.fn(), isMercadoPagoConfigured: () => false }));

import { fulfillFreeOrder, fulfillFromMpOrder, mapMpOrderStatus } from "./order-fulfillment";

const paidMp = { id: "mp1", status: "processed", transactions: { payments: [{ id: "pay1", payment_method: { id: "pix", type: "bank_transfer" } }] } };

beforeEach(() => {
  state.order = { id: "o1", userId: "u1", status: "pending", total: 100, couponCode: "LEX10", items: [{ productId: "p1" }], mpOrderId: null, mpPaymentId: null, paymentMethod: null, paidAt: null };
  state.enrollments.clear();
  state.enrolledCount = 0;
  state.couponUsed = 0;
  state.queue = Promise.resolve();
});

describe("fulfillFromMpOrder (F1-2)", () => {
  it("duas chamadas em paralelo com pedido pago matriculam e contam UMA vez", async () => {
    await Promise.all([fulfillFromMpOrder("o1", paidMp), fulfillFromMpOrder("o1", paidMp)]);
    expect(state.order?.status).toBe("paid");
    expect(state.enrollments.size).toBe(1);
    expect(state.enrolledCount).toBe(1);
    expect(state.couponUsed).toBe(1);
  });

  it("cinco chamadas em paralelo (webhook + polling + /success + reconciliação) continuam contando uma vez", async () => {
    await Promise.all(Array.from({ length: 5 }, () => fulfillFromMpOrder("o1", paidMp)));
    expect(state.enrolledCount).toBe(1);
    expect(state.couponUsed).toBe(1);
  });

  it("status atrasado (processing) não sobrescreve um pedido já pago", async () => {
    await fulfillFromMpOrder("o1", paidMp);
    await fulfillFromMpOrder("o1", { id: "mp1", status: "action_required" });
    expect(state.order?.status).toBe("paid");
  });

  it("recompra reativa a matrícula sem incrementar o contador de alunos", async () => {
    state.enrollments.set("u1:p1", { status: "expired" });
    await fulfillFromMpOrder("o1", paidMp);
    expect(state.enrollments.get("u1:p1")?.status).toBe("active");
    expect(state.enrolledCount).toBe(0);
  });

  it("pedido não pago não matricula", async () => {
    await fulfillFromMpOrder("o1", { id: "mp1", status: "failed" });
    expect(state.order?.status).toBe("failed");
    expect(state.enrollments.size).toBe(0);
  });
});

describe("fulfillFreeOrder (F1-3)", () => {
  it("pedido de R$ 0 é pago e matricula sem Mercado Pago", async () => {
    state.order!.total = 0;
    await fulfillFreeOrder("o1");
    expect(state.order?.status).toBe("paid");
    expect(state.enrollments.size).toBe(1);
    expect(state.couponUsed).toBe(1);
  });

  it("recusa liberar pedido que não é gratuito", async () => {
    await expect(fulfillFreeOrder("o1")).rejects.toThrow("não é gratuito");
    expect(state.enrollments.size).toBe(0);
  });
});

describe("mapMpOrderStatus", () => {
  it.each([
    ["processed", "paid"],
    ["cancelled", "cancelled"],
    ["expired", "cancelled"],
    ["refunded", "refunded"],
    ["failed", "failed"],
    ["action_required", "processing"],
    [undefined, "processing"],
  ])("%s → %s", (mp, ours) => {
    expect(mapMpOrderStatus(mp)).toBe(ours);
  });
});
