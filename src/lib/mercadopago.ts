import { MercadoPagoConfig, Order } from "mercadopago";

export function isMercadoPagoConfigured() {
  return Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN);
}

export function getMpConfig() {
  if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
    throw new Error("MERCADOPAGO_ACCESS_TOKEN não configurado no .env.");
  }
  return new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN });
}

// API de Orders (Checkout Transparente).
export function getMpOrderClient() {
  return new Order(getMpConfig());
}
