// Motivo de recusa do Mercado Pago (API de Orders): o detalhe útil fica no
// pagamento (transactions.payments[0].status_detail), não na order.

type PaymentLike = { status?: string; status_detail?: string };
type OrderLike = { status_detail?: string; transactions?: { payments?: PaymentLike[] } };

// Prefere o detalhe do pagamento ("insufficient_amount", "rejected_high_risk"...).
export function mpStatusDetailOf(order: OrderLike | null | undefined): string | undefined {
  const pay = order?.transactions?.payments?.[0]?.status_detail;
  return pay || order?.status_detail || undefined;
}

// Em recusa, o SDK lança o corpo da resposta (não um Error). Extrai o que der:
// o detalhe do pagamento (se a order veio junto) e os códigos de erro.
export function mpErrorDetail(err: unknown): string {
  if (err instanceof Error) return err.message.slice(0, 300);
  if (!err || typeof err !== "object") return String(err ?? "").slice(0, 300);
  const e = err as {
    data?: OrderLike;
    errors?: Array<{ code?: string; message?: string; details?: unknown }>;
    message?: string;
  } & OrderLike;
  const parts: string[] = [];
  const fromOrder = mpStatusDetailOf(e.data) ?? mpStatusDetailOf(e);
  if (fromOrder) parts.push(fromOrder);
  for (const x of e.errors ?? []) {
    const details = Array.isArray(x.details) ? x.details.join(",") : "";
    parts.push([x.code, details].filter(Boolean).join(":"));
  }
  if (!parts.length && e.message) parts.push(e.message);
  return (parts.filter(Boolean).join(" | ") || JSON.stringify(err)).slice(0, 300);
}

// Mensagem para o aluno conforme o motivo. Nunca expõe o código cru.
export function cardRejectMessage(detail: string | null | undefined): string {
  const d = (detail ?? "").toLowerCase();
  const pix = " Se preferir, pague com Pix: a liberação é na hora.";
  if (d.includes("high_risk") || d.includes("blacklist") || d.includes("fraud"))
    return "O sistema antifraude do Mercado Pago recusou este pagamento no cartão. Tentar de novo com o mesmo cartão costuma ser recusado também." + pix;
  if (d.includes("insufficient"))
    return "Cartão sem limite disponível para este valor. Tente outro cartão ou menos parcelas." + pix;
  if (d.includes("call_for_auth"))
    return "O banco pediu para você autorizar este pagamento. Ligue para o banco do cartão (ou aprove no app dele) e tente de novo." + pix;
  if (d.includes("security_code"))
    return "Código de segurança (CVV) incorreto. Confira e tente novamente.";
  if (d.includes("bad_filled_date") || d.includes("expir"))
    return "Data de validade do cartão incorreta. Confira e tente novamente.";
  if (d.includes("bad_filled"))
    return "Algum dado do cartão está incorreto. Confira número, nome, validade e CVV.";
  if (d.includes("card_disabled") || d.includes("disabled"))
    return "Este cartão está bloqueado ou inativo. Desbloqueie no app do banco ou use outro cartão." + pix;
  if (d.includes("max_attempts"))
    return "Limite de tentativas com este cartão atingido. Use outro cartão." + pix;
  if (d.includes("duplicated"))
    return "Um pagamento igual acabou de ser feito. Aguarde alguns minutos antes de tentar de novo.";
  if (d.includes("installments"))
    return "Este cartão não aceita esse número de parcelas. Escolha outra opção.";
  if (d.includes("by_issuer") || d.includes("by_bank"))
    return "O banco emissor recusou o pagamento. Fale com o banco ou use outro cartão." + pix;
  return "Pagamento não aprovado pelo cartão." + pix;
}
