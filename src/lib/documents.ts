// Validação de CPF, celular e CEP (checkout no navegador e servidor usam as mesmas regras).
// Copiado do plataforma-de-questoes (src/lib/documentos.ts).

export const onlyDigits = (text: string) => text.replace(/\D/g, "");

/** CPF com os dígitos verificadores certos (aceita com ou sem pontuação). */
export function isValidCpf(text: string) {
  const cpf = onlyDigits(text);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const digit = (n: number) => {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += Number(cpf[i]) * (n + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
}

/** Celular ou fixo com DDD: 10 ou 11 dígitos, sem o 55. */
export const isValidPhone = (text: string) => /^[1-9]{2}9?\d{8}$/.test(onlyDigits(text));

export const isValidCep = (text: string) => /^\d{8}$/.test(onlyDigits(text));

export const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;
