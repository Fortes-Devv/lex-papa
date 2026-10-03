// Destino depois do login/cadastro (?callbackUrl=). Só aceita caminho interno
// ("/checkout?..."), nunca outro site ("//x.com", "https://...", "/\x.com").
export function safeCallbackUrl(value: string | null | undefined): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return null;
  return value;
}
