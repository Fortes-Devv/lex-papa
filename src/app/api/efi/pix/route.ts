import { isEfiWebhookAuthorized, syncEfiPix } from "@/lib/efi-payments";

// Avisos de Pix recebido na chave da LEX na Efí. Cadastrado por scripts/efi-configurar.ts com a URL
// https://<site>/api/efi/pix?hmac=<EFI_WEBHOOK_SEGREDO>&ignorar= (a Efí acrescenta "/pix" no fim, que cai no "ignorar").
// Pix que não é nosso (txid desconhecido, ou Pix direto na chave) é ignorado.
export const maxDuration = 30;

export async function POST(request: Request) {
  const url = new URL(request.url);
  if (!isEfiWebhookAuthorized(url)) {
    console.warn("[efi] aviso de Pix sem o segredo certo, ip:", request.headers.get("x-forwarded-for"));
    return new Response("não autorizado", { status: 401 });
  }
  const body = (await request.json().catch(() => ({}))) as { pix?: { txid?: string }[] };
  const txids = [...new Set((body.pix ?? []).map((p) => p.txid).filter((t): t is string => !!t))];
  try {
    for (const txid of txids) await syncEfiPix(txid);
  } catch (err) {
    // Erro faz a Efí tentar de novo mais tarde.
    console.error("[efi] falha ao processar aviso de Pix:", txids, err);
    return new Response("erro", { status: 500 });
  }
  return new Response("ok");
}
