// Tarifa do Mercado Pago por venda no cartão de crédito (Checkout, recebimento na hora).
// Se a tarifa mudar no painel do MP (Taxas e parcelas › Checkout), atualize aqui.
export const MP_CARD_FEE_RATE = 0.0498;

// Parte da tarifa que o cliente cobre no preço do cartão. Hoje 0: o cartão custa o
// mesmo que o Pix e a escola paga a tarifa. (0.2 = cliente cobre 20%; 1 = cobre tudo.)
// Os juros do parcelamento são outra coisa: o cliente paga direto ao MP (parcelado cliente).
export const CLIENT_FEE_SHARE = 0;
export const CARD_FEE_RATE = MP_CARD_FEE_RATE * CLIENT_FEE_SHARE;

/** Valor cobrado no cartão: embute a parte da tarifa que o cliente cobre. */
export function cardPrice(total: number) {
  if (total <= 0) return 0;
  // toFixed tira o ruído de ponto flutuante (ex.: 19.99 * 100 = 1998.9999…) antes de arredondar para cima.
  return Math.ceil(Number(((total / (1 - CARD_FEE_RATE)) * 100).toFixed(6))) / 100;
}
