import { isEfiWebhookAuthorized, processEfiNotification } from "@/lib/efi-payments";

// Avisos da API de Cobranças da Efí (pagamento no cartão). A URL vai em cada cobrança
// (metadata.notification_url), com o segredo. O aviso traz só um token: as mudanças são buscadas na API.
export const maxDuration = 30;

export async function POST(request: Request) {
  const url = new URL(request.url);
  if (!isEfiWebhookAuthorized(url)) {
    console.warn("[efi] aviso de cobrança sem o segredo certo, ip:", request.headers.get("x-forwarded-for"));
    return new Response("não autorizado", { status: 401 });
  }
  // Vem como formulário (notification=<token>); aceita JSON também.
  let token: string | null = null;
  const type = request.headers.get("content-type") ?? "";
  if (type.includes("application/json")) {
    token = ((await request.json().catch(() => ({}))) as { notification?: string }).notification ?? null;
  } else {
    const form = await request.formData().catch(() => null);
    const value = form?.get("notification");
    token = typeof value === "string" ? value : null;
  }
  if (!token || token.length > 200) return new Response("ok");
  try {
    await processEfiNotification(token);
  } catch (err) {
    console.error("[efi] falha ao processar aviso de cobrança:", err);
    return new Response("erro", { status: 500 });
  }
  return new Response("ok");
}
