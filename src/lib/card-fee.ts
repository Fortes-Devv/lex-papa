// Tarifa do Mercado Pago por venda no cartão de crédito (Checkout, recebimento na hora).
// Se a tarifa mudar no painel do MP (Taxas e parcelas › Checkout), atualize aqui.
export const MP_CARD_FEE_RATE = 0.0498;

// Parte da tarifa que o cliente cobre no preço do cartão: 20% (a escola paga 80%).
// R$ 300 no cartão vira R$ 303,02: o cliente paga ~R$ 3 e a escola ~R$ 12 da tarifa.
// Com 1 aqui, a escola receberia o preço cheio. Pix e boleto não mudam.
// Os juros do parcelamento são outra coisa: o cliente paga direto ao MP (parcelado cliente).
export const CLIENT_FEE_SHARE = 0.2;
export const CARD_FEE_RATE = MP_CARD_FEE_RATE * CLIENT_FEE_SHARE;

/** Valor cobrado no cartão: embute a parte da tarifa que o cliente cobre. */
export function cardPrice(total: number) {
  if (total <= 0) return 0;
  return Math.ceil((total / (1 - CARD_FEE_RATE)) * 100) / 100;
}
