// Nomes dos eventos de segurança na tela do admin (Admin › Segurança).
export const SECURITY_EVENT_LABEL: Record<string, string> = {
  login_ok: "Entrou",
  login_fail: "Senha ou e-mail errado",
  login_rate_limited: "Bloqueado por muitas tentativas",
  login_blocked: "Tentou entrar com conta suspensa",
  session_limit: "Aparelho desconectado (limite)",
  session_revoked: "Aparelhos desconectados",
  account_suspended: "Conta suspensa",
  access_denied: "Acesso negado",
};

export const SEVERITY_LABEL: Record<string, string> = { low: "Baixa", medium: "Média", high: "Alta" };
