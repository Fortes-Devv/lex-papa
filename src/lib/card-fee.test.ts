import { describe, expect, it } from "vitest";
import { MP_CARD_FEE_RATE, cardPrice } from "./card-fee";

// O que sobra depois da tarifa do MP (arredondada em centavos).
const net = (charged: number) => Math.round((charged - Math.round(charged * MP_CARD_FEE_RATE * 100) / 100) * 100) / 100;

describe("cardPrice", () => {
  it("cliente cobre 20% da tarifa: R$ 300 vira R$ 303,02", () => {
    const charged = cardPrice(300);
    expect(charged).toBe(303.02);
    expect(net(charged)).toBe(287.93); // a escola paga ~R$ 12 da tarifa
    const fee = Math.round(charged * MP_CARD_FEE_RATE * 100) / 100;
    expect((charged - 300) / fee).toBeCloseTo(0.2, 2);
  });
  it("com cupom de 20%, o cartão sobe na mesma proporção", () => {
    expect(cardPrice(221.6)).toBe(223.83);
  });
  it("pedido gratuito continua zero", () => {
    expect(cardPrice(0)).toBe(0);
  });
});
