import { describe, expect, it } from "vitest";
import { CARD_FEE_RATE, cardPrice } from "./card-fee";

// O que sobra depois da tarifa do MP (arredondada em centavos).
const net = (charged: number) => Math.round((charged - Math.round(charged * CARD_FEE_RATE * 100) / 100) * 100) / 100;

describe("cardPrice", () => {
  it("embute a tarifa: a escola recebe o preço cheio", () => {
    expect(cardPrice(277)).toBe(291.52);
    expect(net(cardPrice(277))).toBe(277);
  });
  it("com cupom de 20%, recebe o valor com desconto", () => {
    expect(net(cardPrice(221.6))).toBeGreaterThanOrEqual(221.6);
  });
  it("pedido gratuito continua zero", () => {
    expect(cardPrice(0)).toBe(0);
  });
});
