// Evita contas com e-mail digitado errado (ex.: "gmaiç.com"): o aluno compra e
// depois não recebe nada nem consegue entrar com o e-mail certo.

const POPULAR = ["gmail.com", "hotmail.com", "outlook.com", "yahoo.com", "yahoo.com.br", "icloud.com", "live.com", "bol.com.br", "uol.com.br", "terra.com.br"];

// Domínio só com letras, números, hífen e ponto (sem acento/ç) e com extensão.
export function invalidEmailReason(email: string): string | null {
  const [user, domain] = email.trim().toLowerCase().split("@");
  if (!user || !domain) return "E-mail inválido.";
  // "xn--" = domínio com acento/ç convertido pelo navegador (ex.: gmaiç.com vira xn--gmai-3oa.com).
  const accented = domain.split(".").some((label) => label.startsWith("xn--"));
  if (accented || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) return `O domínio do e-mail parece digitado errado (sem acento ou ç). Confira o e-mail.`;
  return null;
}

function distance(a: string, b: string) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

// "maria@gmial.com" → "maria@gmail.com". null se o domínio já é conhecido ou não lembra nenhum.
export function suggestEmail(email: string): string | null {
  const [user, domain] = email.trim().toLowerCase().split("@");
  if (!user || !domain || POPULAR.includes(domain)) return null;
  let best: string | null = null;
  let bestD = 3;
  for (const p of POPULAR) {
    const dd = distance(domain, p);
    if (dd < bestD) { bestD = dd; best = p; }
  }
  return best && bestD <= 2 ? `${user}@${best}` : null;
}
