// Tarifa do Mercado Pago por venda no cartão de crédito (Checkout, recebimento na hora).
// O preço no cartão embute essa tarifa para a escola receber o valor cheio: R$ 277 no
// cartão vira R$ 291,52, o MP desconta 4,98% e sobram os R$ 277. Pix e boleto não mudam.
// Os juros do parcelamento são outra coisa: o cliente paga direto ao MP (parcelado cliente).
// Se a tarifa mudar no painel do MP (Taxas e parcelas › Checkout), atualize aqui.
export const CARD_FEE_RATE = 0.0498;

/** Valor cobrado no cartão para, depois da tarifa do MP, sobrar `total`. */
export function cardPrice(total: number) {
  if (total <= 0) return 0;
  return Math.ceil((total / (1 - CARD_FEE_RATE)) * 100) / 100;
}
