import { MercadoPagoConfig, Payment, PaymentRefund } from "mercadopago";

export function isMercadoPagoConfigured() {
  return Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN);
}

export function getMpConfig() {
  if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
    throw new Error("MERCADOPAGO_ACCESS_TOKEN não configurado no .env.");
  }
  return new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN });
}

export function getMpPaymentClient() {
  return new Payment(getMpConfig());
}

export function getMpRefundClient() {
  return new PaymentRefund(getMpConfig());
}
