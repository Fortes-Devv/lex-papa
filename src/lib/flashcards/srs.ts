// Repetição espaçada (SM-2 simplificado, no espírito do Anki). Funções puras:
// rodam no servidor (gravar) e no navegador (mostrar o próximo intervalo nos botões).

export type Rating = 1 | 2 | 3 | 4; // 1 errei · 2 difícil · 3 bom · 4 fácil

export interface SrsState {
  ease: number;
  interval: number; // dias
  reps: number;
  lapses: number;
}

export const NEW_STATE: SrsState = { ease: 2.5, interval: 0, reps: 0, lapses: 0 };
export const MASTERED_DAYS = 21; // a partir daqui o cartão conta como "dominado"
const MAX_INTERVAL = 365;
const MIN_EASE = 1.3;

export const RATING_LABEL: Record<Rating, string> = { 1: "Errei", 2: "Difícil", 3: "Bom", 4: "Fácil" };

/** Próximo estado depois de uma resposta. interval 0 = volta ainda nesta sessão. */
export function schedule(prev: SrsState, rating: Rating): SrsState {
  const ease = prev.ease;
  if (rating === 1) {
    return { ease: Math.max(MIN_EASE, ease - 0.2), interval: 0, reps: 0, lapses: prev.reps > 0 ? prev.lapses + 1 : prev.lapses };
  }
  // Primeiro acerto (cartão novo ou que acabou de ser errado).
  if (prev.reps === 0) {
    const interval = rating === 2 ? 1 : rating === 3 ? 2 : 4;
    return { ease: rating === 4 ? ease + 0.15 : rating === 2 ? Math.max(MIN_EASE, ease - 0.15) : ease, interval, reps: 1, lapses: prev.lapses };
  }
  const base = Math.max(1, prev.interval);
  let interval: number;
  let nextEase = ease;
  if (rating === 2) {
    interval = base * 1.2;
    nextEase = Math.max(MIN_EASE, ease - 0.15);
  } else if (rating === 3) {
    interval = base * ease;
  } else {
    interval = base * ease * 1.3;
    nextEase = ease + 0.15;
  }
  interval = Math.min(MAX_INTERVAL, Math.max(base + 1, Math.round(interval)));
  return { ease: Math.round(nextEase * 100) / 100, interval, reps: prev.reps + 1, lapses: prev.lapses };
}

/** Quando o cartão volta: errei = agora (refaz na sessão); senão, daqui a N dias. */
export function dueDate(state: SrsState, now = new Date()) {
  return new Date(now.getTime() + state.interval * 86400000);
}

/** Texto curto do intervalo para os botões: "agora", "1 dia", "2 sem", "3 meses". */
export function intervalLabel(days: number) {
  if (days <= 0) return "agora";
  if (days === 1) return "1 dia";
  if (days < 14) return `${days} dias`;
  if (days < 60) return `${Math.round(days / 7)} sem`;
  if (days < 365) return `${Math.round(days / 30)} meses`;
  return "1 ano";
}

export const isMastered = (s: Pick<SrsState, "interval">) => s.interval >= MASTERED_DAYS;
