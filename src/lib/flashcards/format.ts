// Tipos de cartão e o formato da importação em massa. Puro: roda no admin e no servidor.

export type FlashcardType = "basic" | "certo_errado" | "lacuna";

export const CARD_TYPES: { id: FlashcardType; label: string; hint: string }[] = [
  { id: "basic", label: "Pergunta e resposta", hint: "Frente com a pergunta, verso com a resposta." },
  { id: "certo_errado", label: "Certo ou Errado", hint: "Afirmação no estilo CESPE: o aluno julga antes de virar." },
  { id: "lacuna", label: "Lacuna (lei seca)", hint: "Texto com {{trechos}} escondidos para completar de memória." },
];

export interface CardInput {
  type: FlashcardType;
  front: string;
  back: string;
  explanation?: string | null;
  source?: string | null;
}

const CLOZE = /\{\{(.+?)\}\}/g;

export const hasCloze = (text: string) => /\{\{(.+?)\}\}/.test(text);

/** Partes do texto de lacuna: texto comum e trechos escondidos, na ordem. */
export function clozeParts(text: string): { text: string; hidden: boolean }[] {
  const parts: { text: string; hidden: boolean }[] = [];
  let last = 0;
  for (const m of text.matchAll(CLOZE)) {
    if (m.index! > last) parts.push({ text: text.slice(last, m.index), hidden: false });
    parts.push({ text: m[1], hidden: true });
    last = m.index! + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), hidden: false });
  return parts;
}

const normalizeAnswer = (v: string) => {
  const t = v.trim().toLowerCase();
  if (["c", "certo", "certa", "v", "verdadeiro"].includes(t)) return "certo";
  if (["e", "errado", "errada", "f", "falso"].includes(t)) return "errado";
  return null;
};

/** Valida um cartão; devolve a mensagem de erro ou null. */
export function validateCard(c: CardInput): string | null {
  if (!c.front.trim()) return "Preencha a frente do cartão.";
  if (c.front.length > 4000 || c.back.length > 4000 || (c.explanation?.length ?? 0) > 4000) return "Texto longo demais (máx. 4000 caracteres).";
  if (c.type === "basic" && !c.back.trim()) return "Preencha a resposta (verso).";
  if (c.type === "certo_errado" && c.back !== "certo" && c.back !== "errado") return "Marque se a afirmação está certa ou errada.";
  if (c.type === "lacuna" && !hasCloze(c.front)) return "Marque ao menos um trecho entre {{chaves duplas}}.";
  return null;
}

/**
 * Importação em massa: um cartão por linha, campos separados por TAB (colar da
 * planilha) ou por ";;".
 *   pergunta ;; resposta ;; explicação? ;; fonte?
 *   C ;; afirmação ;; justificativa? ;; fonte?      (ou E / Certo / Errado)
 *   texto com {{lacunas}} ;; explicação? ;; fonte?
 */
export function parseBulk(text: string): { cards: CardInput[]; errors: string[] } {
  const cards: CardInput[] = [];
  const errors: string[] = [];
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    if (!line || line.startsWith("#")) return;
    const f = (line.includes("\t") ? line.split("\t") : line.split(";;")).map((x) => x.trim());
    let card: CardInput;
    const verdict = f.length >= 2 ? normalizeAnswer(f[0]) : null;
    if (verdict && f[0].length <= 9) {
      card = { type: "certo_errado", front: f[1], back: verdict, explanation: f[2] || null, source: f[3] || null };
    } else if (hasCloze(f[0])) {
      card = { type: "lacuna", front: f[0], back: "", explanation: f[1] || null, source: f[2] || null };
    } else {
      card = { type: "basic", front: f[0], back: f[1] ?? "", explanation: f[2] || null, source: f[3] || null };
    }
    const err = validateCard(card);
    if (err) errors.push(`Linha ${i + 1}: ${err}`);
    else cards.push(card);
  });
  return { cards, errors };
}
