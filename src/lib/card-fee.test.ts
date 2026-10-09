import { describe, expect, it } from "vitest";
import { cardPrice } from "./card-fee";

describe("cardPrice", () => {
  it("sem repasse da tarifa: o cartão custa o mesmo que o Pix", () => {
    expect(cardPrice(277)).toBe(277);
    expect(cardPrice(221.6)).toBe(221.6);
  });
  it("pedido gratuito continua zero", () => {
    expect(cardPrice(0)).toBe(0);
  });
});
