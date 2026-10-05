// Nível e origem de um registro de auditoria, a partir da ação gravada.
export type LogLevel = "erro" | "aviso" | "info";
export type LogOrigin = "pagamentos" | "conteudo" | "usuarios" | "sistema";

export function logLevel(action: string): LogLevel {
  if (action.includes("failed") || action.includes("error")) return "erro";
  if (action.includes("deleted") || action.includes("banned") || action.includes("refunded") || action.includes("reset")) return "aviso";
  return "info";
}

export function logOrigin(action: string, resourceType: string): LogOrigin {
  const a = `${action} ${resourceType}`;
  if (/payment|order|refund|coupon/.test(a)) return "pagamentos";
  if (/product|course|module|lesson|material|quiz|achievement/.test(a)) return "conteudo";
  if (/user/.test(a)) return "usuarios";
  return "sistema";
}

export const ORIGIN_LABEL: Record<LogOrigin, string> = { pagamentos: "pagamentos", conteudo: "conteúdo", usuarios: "usuários", sistema: "sistema" };
