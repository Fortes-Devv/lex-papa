import { db } from "@/lib/db";
import { isEnrollmentActive, isStaffRole } from "@/lib/access";
import { dayKey } from "@/lib/student-area";
import { MASTERED_DAYS, type SrsState } from "./srs";
import type { FlashcardType } from "./format";

// Aluno com matrícula válida no curso, ou equipe (para conferir como o aluno vê).
export async function canStudyCourse(user: { id: string; role: string }, courseId: string) {
  if (isStaffRole(user.role)) return true;
  const course = await db.course.findUnique({ where: { id: courseId }, select: { productId: true } });
  if (!course) return false;
  const enrollment = await db.enrollment.findUnique({ where: { userId_productId: { userId: user.id, productId: course.productId } } });
  return isEnrollmentActive(enrollment);
}

export interface DeckSummary {
  id: string;
  title: string;
  description: string | null;
  total: number;
  fresh: number; // nunca estudados
  due: number; // para revisar agora
  learning: number; // vistos, ainda não dominados
  mastered: number;
  mistakes: number; // errados alguma vez (ou na última vez)
  mastery: number; // 0-100
}

export interface FlashcardsOverview {
  decks: DeckSummary[];
  totals: Omit<DeckSummary, "id" | "title" | "description">;
  reviewedToday: number;
  correctToday: number;
}

export async function loadFlashcardsOverview(userId: string, courseId: string): Promise<FlashcardsOverview> {
  const decks = await db.flashcardDeck.findMany({
    where: { courseId, isPublished: true },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    select: { id: true, title: true, description: true, cards: { select: { id: true } } },
  });
  const cardIds = decks.flatMap((d) => d.cards.map((c) => c.id));
  const reviews = cardIds.length
    ? await db.flashcardReview.findMany({ where: { userId, cardId: { in: cardIds } }, select: { cardId: true, interval: true, dueAt: true, lapses: true, lastRating: true, lastReviewedAt: true } })
    : [];
  const byCard = new Map(reviews.map((r) => [r.cardId, r]));
  const now = new Date();
  const today = dayKey();

  const summaries = decks.map<DeckSummary>((d) => {
    const s = { id: d.id, title: d.title, description: d.description, total: d.cards.length, fresh: 0, due: 0, learning: 0, mastered: 0, mistakes: 0, mastery: 0 };
    for (const c of d.cards) {
      const r = byCard.get(c.id);
      if (!r) { s.fresh++; continue; }
      if (r.dueAt <= now) s.due++;
      if (r.interval >= MASTERED_DAYS) s.mastered++;
      else s.learning++;
      if (r.lapses > 0 || r.lastRating === 1) s.mistakes++;
    }
    // Domínio: dominado vale 1, em aprendizado vale pelo quanto já espaçou.
    const score = d.cards.reduce((acc, c) => {
      const r = byCard.get(c.id);
      return acc + (r ? Math.min(1, r.interval / MASTERED_DAYS) : 0);
    }, 0);
    s.mastery = s.total ? Math.round((score / s.total) * 100) : 0;
    return s;
  });

  const sum = (k: keyof Omit<DeckSummary, "id" | "title" | "description" | "mastery">) => summaries.reduce((a, d) => a + d[k], 0);
  const total = sum("total");
  const todays = reviews.filter((r) => r.lastReviewedAt && dayKey(r.lastReviewedAt).getTime() === today.getTime());
  return {
    decks: summaries,
    totals: {
      total, fresh: sum("fresh"), due: sum("due"), learning: sum("learning"), mastered: sum("mastered"), mistakes: sum("mistakes"),
      mastery: total ? Math.round(summaries.reduce((a, d) => a + d.mastery * d.total, 0) / total) : 0,
    },
    reviewedToday: todays.length,
    correctToday: todays.filter((r) => (r.lastRating ?? 0) >= 2).length,
  };
}

export type StudyMode = "inteligente" | "erros" | "tudo";
export const parseStudyMode = (v: string | undefined): StudyMode => (v === "erros" || v === "tudo" ? v : "inteligente");

export interface StudyCard {
  id: string;
  deckTitle: string;
  type: FlashcardType;
  front: string;
  back: string;
  explanation: string | null;
  source: string | null;
  state: SrsState;
  isNew: boolean;
}

const NEW_PER_SESSION = 20;
const MAX_SESSION = 80;

function shuffle<T>(list: T[]) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Cartões da sessão. inteligente: os vencidos (mais atrasados primeiro) e até 20
 * novos; erros: os que o aluno já errou; tudo: o baralho inteiro, embaralhado.
 */
export async function loadStudySession(userId: string, courseId: string, deckId: string | null, mode: StudyMode): Promise<StudyCard[]> {
  const cards = await db.flashcard.findMany({
    where: { deck: { courseId, isPublished: true, ...(deckId ? { id: deckId } : {}) } },
    orderBy: [{ deck: { order: "asc" } }, { order: "asc" }, { createdAt: "asc" }],
    select: {
      id: true, type: true, front: true, back: true, explanation: true, source: true,
      deck: { select: { title: true } },
      reviews: { where: { userId }, select: { ease: true, interval: true, reps: true, lapses: true, dueAt: true, lastRating: true } },
    },
  });
  const now = new Date();
  const items = cards.map((c) => {
    const r = c.reviews[0];
    return {
      card: {
        id: c.id, deckTitle: c.deck.title, type: c.type as FlashcardType, front: c.front, back: c.back, explanation: c.explanation, source: c.source,
        state: r ? { ease: r.ease, interval: r.interval, reps: r.reps, lapses: r.lapses } : { ease: 2.5, interval: 0, reps: 0, lapses: 0 },
        isNew: !r,
      } satisfies StudyCard,
      review: r,
    };
  });

  if (mode === "tudo") return shuffle(items.map((i) => i.card)).slice(0, MAX_SESSION);
  if (mode === "erros") {
    return shuffle(items.filter((i) => i.review && (i.review.lapses > 0 || i.review.lastRating === 1)).map((i) => i.card)).slice(0, MAX_SESSION);
  }
  const due = items.filter((i) => i.review && i.review.dueAt <= now).sort((a, b) => a.review!.dueAt.getTime() - b.review!.dueAt.getTime());
  const fresh = items.filter((i) => !i.review).slice(0, NEW_PER_SESSION);
  // Intercala novos entre as revisões para a sessão não ficar monótona.
  const out: StudyCard[] = [];
  let n = 0;
  due.forEach((d, i) => {
    out.push(d.card);
    if (i % 3 === 2 && n < fresh.length) out.push(fresh[n++].card);
  });
  while (n < fresh.length) out.push(fresh[n++].card);
  return out.slice(0, MAX_SESSION);
}

/** Quando vence a próxima revisão do curso (para "volte amanhã"). */
export async function nextDueAt(userId: string, courseId: string) {
  const r = await db.flashcardReview.findFirst({
    where: { userId, dueAt: { gt: new Date() }, card: { deck: { courseId, isPublished: true } } },
    orderBy: { dueAt: "asc" },
    select: { dueAt: true },
  });
  return r?.dueAt ?? null;
}

/** Para o cartão da seção: quantos cartões para hoje (vencidos + até 20 novos). */
export async function countFlashcardsToday(userId: string, courseId: string) {
  const inCourse = { deck: { courseId, isPublished: true } };
  try {
    const [total, seen, due] = await Promise.all([
      db.flashcard.count({ where: inCourse }),
      db.flashcardReview.count({ where: { userId, card: inCourse } }),
      db.flashcardReview.count({ where: { userId, dueAt: { lte: new Date() }, card: inCourse } }),
    ]);
    return { total, today: due + Math.min(20, Math.max(0, total - seen)) };
  } catch {
    return { total: 0, today: 0 }; // um selo a menos nunca pode derrubar a tela do curso
  }
}
