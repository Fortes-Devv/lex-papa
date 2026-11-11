import { randomUUID } from "node:crypto";
import type { OrderStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { fulfillFromGateway } from "@/lib/order-fulfillment";
import {
  createCardCharge,
  createPixCharge,
  EfiError,
  efiErrorText,
  efiWebhookUrls,
  getCardCharge,
  getEfiNotification,
  getPixCharge,
  getPixQrCode,
  refundCardCharge,
  refundPix,
  type EfiAddress,
  type EfiCardCharge,
  type EfiCustomer,
  type EfiPixCharge,
} from "@/lib/efi";

// Pagamentos avulsos pela Efí (Pix e cartão), ligados ao nosso pedido:
//   - Pix: orders.efiTxid = txid da cobrança imediata (32 letras e números, gerado aqui).
//   - Cartão: orders.efiChargeId = charge_id da API Cobranças; custom_id = "lex_<orderId>".
// Como no Mercado Pago, nunca confiamos no aviso: sempre buscamos o recurso na API da Efí.

const PIX_EXPIRATION_SECONDS = 30 * 60; // o QR vale 30 minutos (como era no Mercado Pago)
const REFERENCE_PREFIX = "lex_";

// ---------- Pix ----------

function pixStatus(cob: EfiPixCharge): OrderStatus {
  if (cob.status === "CONCLUIDA") {
    const paid = cob.pix?.reduce((s, p) => s + Number(p.valor), 0) ?? 0;
    const returned = cob.pix?.flatMap((p) => p.devolucoes ?? []).filter((d) => d.status === "DEVOLVIDO").reduce((s, d) => s + Number(d.valor), 0) ?? 0;
    return paid > 0 && returned >= paid ? "refunded" : "paid";
  }
  if (cob.status === "ATIVA") {
    // A cobrança vencida continua "ATIVA" na Efí, mas não pode mais ser paga.
    const expires = new Date(cob.calendario.criacao).getTime() + cob.calendario.expiracao * 1000;
    return expires < Date.now() ? "cancelled" : "processing";
  }
  return "cancelled";
}

async function qrOf(cob: EfiPixCharge) {
  if (!cob.loc?.id) throw new Error("A Efí não devolveu o local do QR code.");
  const qr = await getPixQrCode(cob.loc.id);
  const image = qr.imagemQrcode.startsWith("data:") ? qr.imagemQrcode : `data:image/png;base64,${qr.imagemQrcode}`;
  return { qrCode: cob.pixCopiaECola ?? qr.qrcode, qrCodeImage: image };
}

/** Gera o Pix do pedido. O valor vem do pedido (calculado no servidor). */
export async function createEfiPixForOrder(order: { id: string; total: number }, description: string, payer: { cpf: string; name: string }) {
  const txid = randomUUID().replace(/-/g, "");
  // Grava o txid antes de chamar a Efí: se o aviso chegar rápido, o pedido já é encontrado.
  await db.order.update({ where: { id: order.id }, data: { efiTxid: txid, paymentMethod: "pix", status: "processing" } });
  const cob = await createPixCharge(txid, { expiration: PIX_EXPIRATION_SECONDS, amount: order.total, description, payer });
  return qrOf(cob);
}

/** Copia e cola de um Pix ainda aguardando (admin "Copiar Pix"). */
export async function efiPixCode(txid: string) {
  const cob = await getPixCharge(txid);
  return pixStatus(cob) === "processing" ? (cob.pixCopiaECola ?? (await qrOf(cob)).qrCode) : null;
}

/** Busca o Pix na Efí e atualiza o pedido. txid desconhecido (de outro produto na mesma conta) é ignorado. */
export async function syncEfiPix(txid: string) {
  if (!/^[a-zA-Z0-9]{26,35}$/.test(txid)) return null;
  const order = await db.order.findUnique({ where: { efiTxid: txid }, select: { id: true } });
  if (!order) return null;
  const cob = await getPixCharge(txid);
  const status = pixStatus(cob);
  const paidAt = cob.pix?.[0]?.horario ? new Date(cob.pix[0].horario) : null;
  return fulfillFromGateway(order.id, { status, paymentMethod: "pix", paidAt, statusDetail: `Efí Pix: ${cob.status.toLowerCase()}` });
}

// ---------- Cartão ----------

/** Situação da cobrança da Efí no nosso OrderStatus. */
export function cardStatus(s: string): OrderStatus {
  if (s === "approved" || s === "paid" || s === "settled") return "paid";
  if (s === "unpaid") return "failed";
  if (s === "refunded") return "refunded";
  if (s === "contested") return "chargeback";
  if (s === "canceled" || s === "expired") return "cancelled";
  return "processing"; // new, waiting, link
}

/** Última mensagem do histórico da cobrança (o motivo da recusa; "AF - ..." = antifraude). */
const lastMessage = (c: EfiCardCharge) => c.history?.at(-1)?.message ?? null;

export class EfiCardDeclined extends Error {
  constructor(readonly reason: string | null) {
    super(`Cartão recusado${reason ? `: ${reason}` : ""}`);
  }
  get antifraud() {
    return !!this.reason && /\bAF\b|antifraude|risco/i.test(this.reason);
  }
}

/**
 * Cobra o pedido no cartão (token gerado no navegador pelo payment-token-efi). Recusado: o pedido fica "failed"
 * com o motivo e o erro sobe como EfiCardDeclined. Devolve o status (paid ou processing).
 */
export async function chargeOrderWithCard(
  order: { id: string; total: number },
  itemName: string,
  card: { token: string; installments: number; customer: EfiCustomer; address: EfiAddress },
) {
  const urls = efiWebhookUrls();
  const r = await createCardCharge({
    itemName,
    cents: Math.round(order.total * 100),
    reference: `${REFERENCE_PREFIX}${order.id}`,
    // Em localhost não há como receber o aviso (e a Efí recusa URL sem https): a tela e a consulta conferem.
    notificationUrl: urls.cobrancas.startsWith("https://") ? urls.cobrancas : undefined,
    token: card.token,
    installments: card.installments,
    customer: card.customer,
    address: card.address,
  });
  await db.order.update({ where: { id: order.id }, data: { efiChargeId: String(r.charge_id), paymentMethod: "credit_card" } });
  let status = cardStatus(r.status);
  let reason: string | null = r.reason ?? null;
  if (status === "failed" || status === "processing") {
    const full = await getCardCharge(r.charge_id).catch(() => null);
    if (full) {
      status = cardStatus(full.status);
      reason = lastMessage(full) ?? reason;
    }
  }
  await fulfillFromGateway(order.id, { status, paymentMethod: "credit_card", statusDetail: `Efí cartão: ${r.status}${reason ? ` (${reason})` : ""}`.slice(0, 300) });
  if (status === "failed" || status === "cancelled") throw new EfiCardDeclined(reason);
  return status;
}

/** Busca a cobrança do cartão na Efí e atualiza o pedido. */
export async function syncEfiCharge(chargeId: string) {
  if (!/^\d{1,20}$/.test(chargeId)) return null;
  const order = await db.order.findUnique({ where: { efiChargeId: chargeId }, select: { id: true } });
  if (!order) return null;
  const c = await getCardCharge(chargeId);
  const reason = lastMessage(c);
  return fulfillFromGateway(order.id, { status: cardStatus(c.status), paymentMethod: "credit_card", statusDetail: `Efí cartão: ${c.status}${reason ? ` (${reason})` : ""}`.slice(0, 300) });
}

/** Aviso da API de Cobranças: busca as mudanças pelo token e atualiza cada cobrança citada. */
export async function processEfiNotification(token: string) {
  const changes = await getEfiNotification(token);
  const ids = new Set(changes.map((c) => c.identifiers?.charge_id).filter((id): id is number => !!id).map(String));
  for (const id of ids) await syncEfiCharge(id);
  return ids.size;
}

// ---------- Pedido ----------

/** Re-consulta a Efí para um pedido nosso (polling do checkout, /success, reconciliação). */
export async function syncEfiOrder(order: { efiTxid: string | null; efiChargeId: string | null }) {
  if (order.efiTxid) return syncEfiPix(order.efiTxid);
  if (order.efiChargeId) return syncEfiCharge(order.efiChargeId);
  return null;
}

/** Estorno total na Efí (Pix: devolução; cartão: estorno). */
export async function refundEfiOrder(order: { id: string; total: number; efiTxid: string | null; efiChargeId: string | null }) {
  if (order.efiTxid) {
    const cob = await getPixCharge(order.efiTxid);
    const pix = cob.pix?.[0];
    if (!pix) throw new Error("Pix não encontrado na Efí.");
    // id da devolução: nosso, até 35 letras e números (repetir o mesmo id não devolve duas vezes).
    const refundId = `r${order.id.replace(/[^a-zA-Z0-9]/g, "")}`.slice(0, 35);
    await refundPix(pix.endToEndId, refundId, Number(pix.valor));
    return;
  }
  if (order.efiChargeId) {
    await refundCardCharge(order.efiChargeId);
    return;
  }
  throw new Error("Pedido sem cobrança na Efí.");
}

/** Mensagem para o aluno quando o cartão não passa (em português simples). */
export function efiCardErrorMessage(err: unknown) {
  if (err instanceof EfiCardDeclined && err.antifraud) {
    return "O pagamento não passou na análise de segurança da Efí (não foi o seu banco). Evite tentar várias vezes seguidas com o mesmo cartão: tente mais tarde, de preferência pelo Chrome, ou pague com Pix, que libera na hora.";
  }
  if (err instanceof EfiCardDeclined) {
    return "O banco recusou o pagamento. Confira os dados do cartão, veja se ele tem limite e se compras online estão liberadas no app do banco, ou pague com Pix, que libera na hora.";
  }
  const t = efiErrorText(err).toLowerCase();
  if (t.includes("birth") || t.includes("nascimento")) return "Confira a data de nascimento do titular.";
  if (t.includes("cpf")) return "Confira o CPF do titular do cartão.";
  if (t.includes("phone")) return "Confira o celular com DDD.";
  if (t.includes("email")) return "Confira o e-mail da sua conta.";
  if (t.includes("zipcode") || t.includes("cep") || t.includes("billing_address")) return "Confira o endereço de cobrança.";
  if (t.includes("installment") || t.includes("parcela")) return "Número de parcelas indisponível para este cartão.";
  if (t.includes("payment_token") || t.includes("token")) return "Os dados do cartão expiraram. Confira e tente de novo.";
  return "Não foi possível concluir o pagamento. Confira os dados ou pague com Pix, que libera na hora.";
}

export { EfiError, efiErrorText, efiWebhookUrls };
export { isEfiWebhookAuthorized } from "@/lib/efi";
