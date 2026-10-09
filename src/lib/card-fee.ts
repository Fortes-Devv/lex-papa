// Tarifa do Mercado Pago por venda no cartão de crédito (Checkout, recebimento na hora).
// Se a tarifa mudar no painel do MP (Taxas e parcelas › Checkout), atualize aqui.
export const MP_CARD_FEE_RATE = 0.0498;

// Quanto dessa tarifa o cliente cobre no preço do cartão. A escola absorve o resto
// (hoje 0,98 ponto): R$ 277 no cartão vira R$ 288,55 e sobram ~R$ 274,18.
// Com 0.0498 aqui, a escola receberia o preço cheio. Pix e boleto não mudam.
// Os juros do parcelamento são outra coisa: o cliente paga direto ao MP (parcelado cliente).
export const CARD_FEE_RATE = 0.04;

/** Valor cobrado no cartão: embute a parte da tarifa que o cliente cobre. */
export function cardPrice(total: number) {
  if (total <= 0) return 0;
  return Math.ceil((total / (1 - CARD_FEE_RATE)) * 100) / 100;
}
