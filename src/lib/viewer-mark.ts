// Marca-d'água do aluno no player: identifica quem estava assistindo, sem expor dado
// pessoal (sem e-mail, sem CPF). O código são os 6 últimos caracteres do ID da conta;
// a busca de Admin › Usuários aceita "#CÓDIGO" para achar o aluno de um vídeo vazado.

export const viewerCode = (userId: string) => userId.slice(-6).toUpperCase();

export function viewerMark(user: { id: string; name?: string | null }) {
  const first = (user.name ?? "").trim().split(/\s+/)[0] ?? "";
  return `${first ? `${first.slice(0, 18)} · ` : ""}#${viewerCode(user.id)}`;
}

// "#ABC123" (ou "abc123") digitado na busca do admin.
export function codeFromSearch(search: string): string | null {
  const m = search.trim().match(/^#?([A-Za-z0-9]{6})$/);
  return m ? m[1].toUpperCase() : null;
}
