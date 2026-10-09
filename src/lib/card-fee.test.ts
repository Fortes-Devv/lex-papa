import { describe, expect, it } from "vitest";
import { MP_CARD_FEE_RATE, cardPrice } from "./card-fee";

// O que sobra depois da tarifa do MP (arredondada em centavos).
const net = (charged: number) => Math.round((charged - Math.round(charged * MP_CARD_FEE_RATE * 100) / 100) * 100) / 100;

describe("cardPrice", () => {
  it("cliente cobre 4% da tarifa: R$ 277 vira R$ 288,55", () => {
    expect(cardPrice(277)).toBe(288.55);
    expect(net(cardPrice(277))).toBe(274.18);
  });
  it("com cupom de 20%, o cartão sobe na mesma proporção", () => {
    expect(cardPrice(221.6)).toBe(230.84);
  });
  it("pedido gratuito continua zero", () => {
    expect(cardPrice(0)).toBe(0);
  });
});
