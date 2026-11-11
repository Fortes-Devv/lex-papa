import { timingSafeEqual } from "node:crypto";
import { Agent, request } from "node:https";

// Cliente das APIs da Efí (Pix e Cobranças), adaptado do plataforma-de-questoes. Só servidor.
// Aqui não há assinatura: Pix avulso (cobrança imediata) e cartão avulso (cobrança one-step, com parcelas).
//
// - API Pix: exige o certificado (.p12) em toda chamada (mTLS), inclusive na do token.
// - API Cobranças (cartão): o certificado vai junto se existir; o servidor só usa se pedir.
//
// Variáveis (ver .env.example):
//   EFI_CLIENT_ID, EFI_CLIENT_SECRET   credenciais da aplicação (produção ou homologação)
//   EFI_CERTIFICADO                    o .p12 da Efí em base64 (uma linha)
//   EFI_CHAVE_PIX                      chave Pix que recebe (uma chave aleatória só da LEX)
//   EFI_SANDBOX                        "true" para homologação
//   EFI_WEBHOOK_SEGREDO                texto aleatório que vai na URL dos avisos
//   NEXT_PUBLIC_EFI_CONTA              identificador de conta (formulário do cartão, no navegador)

const sandbox = () => process.env.EFI_SANDBOX === "true";

const BASES = {
  pix: () => (sandbox() ? "https://pix-h.api.efipay.com.br" : "https://pix.api.efipay.com.br"),
  cobrancas: () => (sandbox() ? "https://cobrancas-h.api.efipay.com.br" : "https://cobrancas.api.efipay.com.br"),
};

type Api = keyof typeof BASES;

/** Pix na Efí configurado (credenciais, certificado e chave). */
export function isEfiPixConfigured() {
  return !!(process.env.EFI_CLIENT_ID && process.env.EFI_CLIENT_SECRET && process.env.EFI_CERTIFICADO && process.env.EFI_CHAVE_PIX);
}

/** Cartão na Efí configurado (credenciais e o identificador de conta usado no navegador). */
export function isEfiCardConfigured() {
  return !!(process.env.EFI_CLIENT_ID && process.env.EFI_CLIENT_SECRET && process.env.NEXT_PUBLIC_EFI_CONTA);
}

/** Pagamentos novos saem pela Efí quando Pix e cartão estão configurados. */
export const isEfiConfigured = () => isEfiPixConfigured() && isEfiCardConfigured();

export const efiEnvironment = () => (sandbox() ? ("sandbox" as const) : ("production" as const));

let agent: Agent | null = null;
function tlsAgent() {
  if (agent) return agent;
  const cert = process.env.EFI_CERTIFICADO;
  // O .p12 da Efí vem sem senha.
  agent = new Agent({ keepAlive: true, ...(cert ? { pfx: Buffer.from(cert, "base64"), passphrase: "" } : {}) });
  return agent;
}

export class EfiError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
    path: string,
  ) {
    super(`Efí ${status} em ${path}: ${JSON.stringify(body).slice(0, 500)}`);
  }
}

function call(api: Api, method: string, path: string, opts: { body?: unknown; authorization: string; headers?: Record<string, string> }) {
  const url = new URL(path, BASES[api]());
  const body = opts.body === undefined ? undefined : JSON.stringify(opts.body);
  return new Promise<unknown>((resolve, reject) => {
    const req = request(
      url,
      {
        method,
        agent: tlsAgent(),
        timeout: 15_000,
        headers: {
          authorization: opts.authorization,
          accept: "application/json",
          ...(body ? { "content-type": "application/json", "content-length": Buffer.byteLength(body) } : {}),
          ...opts.headers,
        },
      },
      (res) => {
        const parts: Buffer[] = [];
        res.on("data", (p: Buffer) => parts.push(p));
        res.on("end", () => {
          const text = Buffer.concat(parts).toString("utf8");
          let json: unknown = text;
          try {
            json = text ? JSON.parse(text) : null;
          } catch {
            // resposta sem JSON (ex.: 204)
          }
          const status = res.statusCode ?? 0;
          if (status >= 200 && status < 300) resolve(json);
          else reject(new EfiError(status, json, `${method} ${path}`));
        });
      },
    );
    req.on("timeout", () => req.destroy(new Error(`Efí: tempo esgotado em ${method} ${path}`)));
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

// Token de acesso (vale 1 hora): guardado na memória da função enquanto ela estiver quente.
const tokens: Partial<Record<Api, { value: string; expires: number }>> = {};

async function token(api: Api) {
  const t = tokens[api];
  if (t && t.expires > Date.now() + 60_000) return t.value;
  const id = process.env.EFI_CLIENT_ID;
  const secret = process.env.EFI_CLIENT_SECRET;
  if (!id || !secret) throw new Error("EFI_CLIENT_ID e EFI_CLIENT_SECRET não configurados.");
  const basic = `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`;
  const path = api === "pix" ? "/oauth/token" : "/v1/authorize";
  const r = (await call(api, "POST", path, { body: { grant_type: "client_credentials" }, authorization: basic })) as { access_token?: string; expires_in?: number };
  if (!r?.access_token) throw new Error("A Efí não devolveu o token de acesso.");
  tokens[api] = { value: r.access_token, expires: Date.now() + (r.expires_in ?? 3600) * 1000 };
  return r.access_token;
}

async function efi<T>(api: Api, method: string, path: string, body?: unknown, headers?: Record<string, string>) {
  return (await call(api, method, path, { body, authorization: `Bearer ${await token(api)}`, headers })) as T;
}

// ---------- API Pix ----------

export type EfiPixCharge = {
  txid: string;
  status: "ATIVA" | "CONCLUIDA" | "REMOVIDA_PELO_USUARIO_RECEBEDOR" | "REMOVIDA_PELO_PSP";
  calendario: { criacao: string; expiracao: number };
  valor: { original: string };
  loc?: { id: number };
  pixCopiaECola?: string;
  pix?: { endToEndId: string; valor: string; horario: string; devolucoes?: { id: string; valor: string; status: string }[] }[];
};

/** Cria a cobrança imediata com o nosso txid (26 a 35 letras e números). */
export function createPixCharge(txid: string, data: { expiration: number; amount: number; description: string; payer?: { cpf: string; name: string } }) {
  return efi<EfiPixCharge>("pix", "PUT", `/v2/cob/${txid}`, {
    calendario: { expiracao: data.expiration },
    ...(data.payer ? { devedor: { cpf: data.payer.cpf, nome: data.payer.name.slice(0, 200) } } : {}),
    valor: { original: data.amount.toFixed(2) },
    chave: process.env.EFI_CHAVE_PIX,
    solicitacaoPagador: data.description.slice(0, 140),
  });
}

export const getPixCharge = (txid: string) => efi<EfiPixCharge>("pix", "GET", `/v2/cob/${txid}`);

/** QR code da cobrança: imagem (data URI) e o copia e cola. */
export const getPixQrCode = (locId: number) => efi<{ qrcode: string; imagemQrcode: string }>("pix", "GET", `/v2/loc/${locId}/qrcode`);

/** Devolução (estorno) de um Pix recebido. `id` é nosso (até 35 letras e números). */
export const refundPix = (endToEndId: string, id: string, amount: number) =>
  efi<{ id: string; status: string }>("pix", "PUT", `/v2/pix/${encodeURIComponent(endToEndId)}/devolucao/${id}`, { valor: amount.toFixed(2) });

/**
 * Cadastra a URL dos avisos de Pix da chave. A Vercel não faz TLS mútuo, então vai o "x-skip-mtls-checking" e a
 * segurança fica por conta do segredo na URL (e de sempre buscar a cobrança na API antes de gravar).
 */
export const registerPixWebhook = (url: string) =>
  efi<unknown>("pix", "PUT", `/v2/webhook/${encodeURIComponent(process.env.EFI_CHAVE_PIX ?? "")}`, { webhookUrl: url }, { "x-skip-mtls-checking": "true" });

export const getPixWebhook = () => efi<{ webhookUrl?: string }>("pix", "GET", `/v2/webhook/${encodeURIComponent(process.env.EFI_CHAVE_PIX ?? "")}`);

// ---------- API Cobranças (cartão avulso) ----------

type CobrancasResponse<T> = { code: number; data: T };

export type EfiCustomer = { name: string; cpf: string; email: string; phone_number: string; birth: string };
export type EfiAddress = { street: string; number: string; neighborhood: string; zipcode: string; city: string; state: string; complement?: string };

export type EfiCardCharge = {
  charge_id: number;
  total: number; // centavos
  status: string; // new, waiting, approved, paid, unpaid, refunded, contested, canceled, settled
  custom_id?: string | null;
  created_at?: string;
  payment?: { method?: string; credit_card?: { installments?: number; installment_value?: number; reason?: string } | null } | null;
  history?: { message: string; created_at: string }[];
};

/** Cobrança avulsa no cartão em um passo (cria e paga). Os juros das parcelas, se houver, a Efí soma no total. */
export async function createCardCharge(data: {
  itemName: string;
  cents: number;
  reference: string;
  notificationUrl?: string;
  token: string;
  installments: number;
  customer: EfiCustomer;
  address: EfiAddress;
}) {
  const r = await efi<CobrancasResponse<{ charge_id: number; status: string; total: number; installments?: number; reason?: string }>>("cobrancas", "POST", "/v1/charge/one-step", {
    items: [{ name: data.itemName.slice(0, 255), value: data.cents, amount: 1 }],
    metadata: { custom_id: data.reference, ...(data.notificationUrl ? { notification_url: data.notificationUrl } : {}) },
    payment: {
      credit_card: {
        installments: data.installments,
        payment_token: data.token,
        billing_address: { ...data.address, complement: data.address.complement || undefined },
        customer: data.customer,
      },
    },
  });
  return r.data;
}

export const getCardCharge = async (id: string | number) => (await efi<CobrancasResponse<EfiCardCharge>>("cobrancas", "GET", `/v1/charge/${id}`)).data;

/** Estorno total do cartão. */
export const refundCardCharge = (id: string | number) => efi<unknown>("cobrancas", "POST", `/v1/charge/card/${id}/refund`, {});

/** Só consulta: lista os planos (usado no teste de conexão das Cobranças). */
export const listPlans = () => efi<CobrancasResponse<unknown[]>>("cobrancas", "GET", "/v1/plans");

export type EfiNotificationChange = {
  id: number;
  type: string;
  custom_id?: string | null;
  status?: { current: string; previous: string | null };
  identifiers?: { charge_id?: number };
};

/** O aviso da Efí traz só um token; as mudanças são buscadas aqui (com o nosso acesso). */
export const getEfiNotification = async (token: string) =>
  (await efi<CobrancasResponse<EfiNotificationChange[]>>("cobrancas", "GET", `/v1/notification/${encodeURIComponent(token)}`)).data ?? [];

/** Mensagem de erro da API (para log e para entender a recusa). */
export function efiErrorText(err: unknown) {
  if (!(err instanceof EfiError)) return err instanceof Error ? err.message : String(err);
  const c = err.body as { error_description?: unknown; mensagem?: string; detail?: string } | null;
  const d = c?.error_description;
  return typeof d === "string" ? d : d ? JSON.stringify(d) : (c?.mensagem ?? c?.detail ?? err.message);
}

// ---------- Avisos (webhooks) ----------

function siteUrl() {
  return (process.env.APP_URL || "https://lexcursos.site").replace(/\/$/, "");
}

/** URLs dos avisos, com o segredo (a Vercel não faz TLS mútuo; o segredo prova que veio de quem tem a URL). */
export function efiWebhookUrls() {
  const secret = encodeURIComponent(process.env.EFI_WEBHOOK_SEGREDO ?? "");
  const site = siteUrl();
  return {
    // "ignorar=" no fim: a Efí acrescenta "/pix" à URL, e assim ele cai no parâmetro em vez de mudar o caminho.
    pix: `${site}/api/efi/pix?hmac=${secret}&ignorar=`,
    cobrancas: `${site}/api/efi/cobrancas?hmac=${secret}`,
  };
}

/** Confere o segredo da URL dos avisos (?hmac=...). */
export function isEfiWebhookAuthorized(url: URL) {
  const secret = process.env.EFI_WEBHOOK_SEGREDO;
  const got = url.searchParams.get("hmac");
  if (!secret || !got) return false;
  const a = Buffer.from(secret);
  const b = Buffer.from(got);
  return a.length === b.length && timingSafeEqual(a, b);
}
