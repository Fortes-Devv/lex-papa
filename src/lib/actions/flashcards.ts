"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireStaff } from "@/lib/auth-guards";
import { db } from "@/lib/db";
import { awardXp } from "@/lib/gamification";
import { dayKey } from "@/lib/student-area";
import { disciplineName } from "@/lib/discipline";
import { canStudyCourse } from "@/lib/flashcards/queries";
import { dueDate, schedule, type Rating } from "@/lib/flashcards/srs";
import { parseBulk, validateCard, type CardInput } from "@/lib/flashcards/format";

const SESSION_EXPIRED = { success: false as const, error: "Sua sessão expirou. Entre novamente." };

// ── Aluno ──────────────────────────────────────────────────────────────────

/** Grava a resposta do aluno a um cartão e agenda a próxima revisão. */
export async function reviewFlashcard(input: { courseId: string; cardId: string; rating: number; seconds: number }) {
  const user = (await auth())?.user;
  if (!user) return SESSION_EXPIRED;
  const rating = Math.round(input.rating) as Rating;
  if (![1, 2, 3, 4].includes(rating)) return { success: false as const, error: "Resposta inválida." };

  const card = await db.flashcard.findFirst({
    where: { id: input.cardId, deck: { courseId: input.courseId, isPublished: true } },
    select: { id: true },
  });
  if (!card) return { success: false as const, error: "Cartão não encontrado." };
  if (!(await canStudyCourse(user, input.courseId))) return { success: false as const, error: "Você não tem acesso a este curso." };

  const where = { userId_cardId: { userId: user.id, cardId: card.id } };
  const prev = await db.flashcardReview.findUnique({ where });
  const next = schedule(prev ?? { ease: 2.5, interval: 0, reps: 0, lapses: 0 }, rating);
  const now = new Date();
  const data = { ...next, dueAt: dueDate(next, now), lastRating: rating, lastReviewedAt: now };
  await db.flashcardReview.upsert({
    where,
    update: { ...data, totalReviews: { increment: 1 } },
    create: { userId: user.id, cardId: card.id, ...data, totalReviews: 1 },
  });

  // Tempo de estudo do dia (meta da semana) e XP: 1 por cartão, 2 se acertou.
  const add = Math.max(0, Math.min(Math.round(input.seconds) || 0, 120));
  if (add > 0) {
    const date = dayKey(now);
    await db.studyDay.upsert({
      where: { userId_date: { userId: user.id, date } },
      update: { seconds: { increment: add } },
      create: { userId: user.id, date, seconds: add },
    });
  }
  const xp = rating === 1 ? 1 : 2;
  await awardXp(user.id, xp);
  return { success: true as const, xp, interval: next.interval };
}

// ── Admin ──────────────────────────────────────────────────────────────────

function refresh(courseId: string) {
  revalidatePath(`/admin/courses/${courseId}`);
  revalidatePath("/student/course");
}

async function deckCourse(deckId: string) {
  return (await db.flashcardDeck.findUnique({ where: { id: deckId }, select: { courseId: true } }))?.courseId ?? null;
}

export async function createDeck(courseId: string, title: string) {
  await requireStaff();
  const name = title.trim().slice(0, 120);
  if (!name) return { success: false as const, error: "Dê um nome ao baralho." };
  const last = await db.flashcardDeck.findFirst({ where: { courseId }, orderBy: { order: "desc" }, select: { order: true } });
  const deck = await db.flashcardDeck.create({ data: { courseId, title: name, order: (last?.order ?? -1) + 1 } });
  refresh(courseId);
  return { success: true as const, deckId: deck.id };
}

/** Um baralho por disciplina do curso (pelo título dos módulos), pulando os que já existem. */
export async function createDecksFromDisciplines(courseId: string) {
  await requireStaff();
  const modules = await db.courseModule.findMany({ where: { courseId, section: "aulas" }, orderBy: { order: "asc" }, select: { module: { select: { title: true } } } });
  const names = [...new Set(modules.map((m) => disciplineName(m.module.title)).filter(Boolean))];
  const existing = new Set((await db.flashcardDeck.findMany({ where: { courseId }, select: { title: true } })).map((d) => d.title.toLowerCase()));
  const missing = names.filter((n) => !existing.has(n.toLowerCase()));
  if (!missing.length) return { success: true as const, created: 0 };
  const last = await db.flashcardDeck.findFirst({ where: { courseId }, orderBy: { order: "desc" }, select: { order: true } });
  const start = (last?.order ?? -1) + 1;
  await db.flashcardDeck.createMany({ data: missing.map((title, i) => ({ courseId, title, order: start + i })) });
  refresh(courseId);
  return { success: true as const, created: missing.length };
}

export async function updateDeck(deckId: string, input: { title?: string; description?: string | null; isPublished?: boolean }) {
  await requireStaff();
  const courseId = await deckCourse(deckId);
  if (!courseId) return { success: false as const, error: "Baralho não encontrado." };
  if (input.title !== undefined && !input.title.trim()) return { success: false as const, error: "Dê um nome ao baralho." };
  await db.flashcardDeck.update({
    where: { id: deckId },
    data: {
      ...(input.title !== undefined ? { title: input.title.trim().slice(0, 120) } : {}),
      ...(input.description !== undefined ? { description: input.description?.trim().slice(0, 300) || null } : {}),
      ...(input.isPublished !== undefined ? { isPublished: input.isPublished } : {}),
    },
  });
  refresh(courseId);
  return { success: true as const };
}

export async function moveDeck(deckId: string, direction: -1 | 1) {
  await requireStaff();
  const courseId = await deckCourse(deckId);
  if (!courseId) return { success: false as const, error: "Baralho não encontrado." };
  const decks = await db.flashcardDeck.findMany({ where: { courseId }, orderBy: [{ order: "asc" }, { createdAt: "asc" }], select: { id: true } });
  const i = decks.findIndex((d) => d.id === deckId);
  const j = i + direction;
  if (i < 0 || j < 0 || j >= decks.length) return { success: true as const };
  [decks[i], decks[j]] = [decks[j], decks[i]];
  await db.$transaction(decks.map((d, order) => db.flashcardDeck.update({ where: { id: d.id }, data: { order } })));
  refresh(courseId);
  return { success: true as const };
}

export async function deleteDeck(deckId: string) {
  await requireStaff();
  const courseId = await deckCourse(deckId);
  if (!courseId) return { success: false as const, error: "Baralho não encontrado." };
  await db.flashcardDeck.delete({ where: { id: deckId } });
  refresh(courseId);
  return { success: true as const };
}

function cleanCard(c: CardInput): CardInput {
  return {
    type: c.type,
    front: c.front.trim(),
    back: c.type === "lacuna" ? "" : c.back.trim(),
    explanation: c.explanation?.trim() || null,
    source: c.source?.trim().slice(0, 200) || null,
  };
}

/** Cria (cardId null) ou edita um cartão. */
export async function saveCard(deckId: string, cardId: string | null, input: CardInput) {
  await requireStaff();
  const courseId = await deckCourse(deckId);
  if (!courseId) return { success: false as const, error: "Baralho não encontrado." };
  const card = cleanCard(input);
  const err = validateCard(card);
  if (err) return { success: false as const, error: err };
  if (cardId) {
    const updated = await db.flashcard.updateMany({ where: { id: cardId, deckId }, data: card });
    if (!updated.count) return { success: false as const, error: "Cartão não encontrado." };
  } else {
    const last = await db.flashcard.findFirst({ where: { deckId }, orderBy: { order: "desc" }, select: { order: true } });
    await db.flashcard.create({ data: { deckId, ...card, order: (last?.order ?? -1) + 1 } });
  }
  refresh(courseId);
  return { success: true as const };
}

export async function deleteCard(cardId: string) {
  await requireStaff();
  const card = await db.flashcard.findUnique({ where: { id: cardId }, select: { deck: { select: { courseId: true } } } });
  if (!card) return { success: false as const, error: "Cartão não encontrado." };
  await db.flashcard.delete({ where: { id: cardId } });
  refresh(card.deck.courseId);
  return { success: true as const };
}

/** Importação em massa (um cartão por linha). Grava os válidos e devolve os erros. */
export async function importCards(deckId: string, text: string) {
  await requireStaff();
  const courseId = await deckCourse(deckId);
  if (!courseId) return { success: false as const, error: "Baralho não encontrado." };
  if (text.length > 500_000) return { success: false as const, error: "Texto grande demais. Importe em partes." };
  const { cards, errors } = parseBulk(text);
  if (cards.length) {
    const last = await db.flashcard.findFirst({ where: { deckId }, orderBy: { order: "desc" }, select: { order: true } });
    const start = (last?.order ?? -1) + 1;
    await db.flashcard.createMany({ data: cards.map((c, i) => ({ deckId, ...cleanCard(c), order: start + i })) });
    refresh(courseId);
  }
  return { success: true as const, created: cards.length, errors };
}
