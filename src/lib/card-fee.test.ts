import { describe, expect, it } from "vitest";
import { MP_CARD_FEE_RATE, cardPrice } from "./card-fee";

// O que sobra depois da tarifa do MP (arredondada em centavos).
const net = (charged: number) => Math.round((charged - Math.round(charged * MP_CARD_FEE_RATE * 100) / 100) * 100) / 100;

describe("cardPrice", () => {
  it("cliente cobre 0,98 ponto da tarifa: R$ 300 vira R$ 302,97", () => {
    expect(cardPrice(300)).toBe(302.97);
    expect(net(cardPrice(300))).toBe(287.88);
    expect(cardPrice(277)).toBe(279.75);
  });
  it("com cupom de 20%, o cartão sobe na mesma proporção", () => {
    expect(cardPrice(221.6)).toBe(223.8);
  });
  it("pedido gratuito continua zero", () => {
    expect(cardPrice(0)).toBe(0);
  });
});
