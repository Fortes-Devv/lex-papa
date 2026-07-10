"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { markLessonComplete } from "@/lib/actions/learning";
import type { Prisma } from "@prisma/client";

export type QuizQuestionType = "single_choice" | "true_false";

export interface QuizOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface QuizQuestionInput {
  question: string;
  type: QuizQuestionType;
  options: QuizOption[];
  explanation?: string;
  points: number;
}

async function requireStaff() {
  const session = await auth();
  if (!session?.user || !["admin", "moderator", "teacher"].includes(session.user.role)) {
    throw new Error("Não autorizado.");
  }
  return session;
}

/** Carrega o quiz de uma aula para edição (inclui as respostas corretas — só staff). */
export async function getQuizForEdit(lessonId: string) {
  await requireStaff();
  const quiz = await db.quiz.findUnique({
    where: { lessonId },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  if (!quiz) return null;
  return {
    title: quiz.title,
    description: quiz.description ?? "",
    passingScore: quiz.passingScore,
    maxAttempts: quiz.maxAttempts,
    showAnswers: quiz.showAnswers,
    questions: quiz.questions.map((q) => ({
      question: q.question,
      type: (q.type as QuizQuestionType) ?? "single_choice",
      options: (q.options as unknown as QuizOption[]) ?? [],
      explanation: q.explanation ?? "",
      points: q.points,
    })),
  };
}

/** Cria/atualiza o quiz da aula, substituindo as questões. */
export async function saveQuiz(lessonId: string, input: {
  title: string;
  description?: string;
  passingScore: number;
  maxAttempts: number;
  showAnswers: boolean;
  questions: QuizQuestionInput[];
}) {
  await requireStaff();

  if (!input.title.trim()) return { success: false as const, error: "Dê um título ao quiz." };
  if (input.questions.length === 0) return { success: false as const, error: "Adicione ao menos uma questão." };
  for (const q of input.questions) {
    if (!q.question.trim()) return { success: false as const, error: "Toda questão precisa de um enunciado." };
    if (q.options.length < 2) return { success: false as const, error: `A questão "${q.question.slice(0, 30)}…" precisa de pelo menos 2 alternativas.` };
    if (q.options.some((o) => !o.text.trim())) return { success: false as const, error: `Preencha todas as alternativas de "${q.question.slice(0, 30)}…".` };
    if (!q.options.some((o) => o.isCorrect)) return { success: false as const, error: `Marque a alternativa correta de "${q.question.slice(0, 30)}…".` };
  }

  const lesson = await db.lesson.findUnique({ where: { id: lessonId }, select: { id: true } });
  if (!lesson) return { success: false as const, error: "Aula não encontrada." };

  const quiz = await db.quiz.upsert({
    where: { lessonId },
    update: {
      title: input.title,
      description: input.description || null,
      passingScore: input.passingScore,
      maxAttempts: input.maxAttempts,
      showAnswers: input.showAnswers,
    },
    create: {
      lessonId,
      title: input.title,
      description: input.description || null,
      passingScore: input.passingScore,
      maxAttempts: input.maxAttempts,
      showAnswers: input.showAnswers,
    },
  });

  // Substitui as questões (sequencial: driver Neon).
  await db.quizQuestion.deleteMany({ where: { quizId: quiz.id } });
  for (let i = 0; i < input.questions.length; i++) {
    const q = input.questions[i];
    await db.quizQuestion.create({
      data: {
        quizId: quiz.id,
        question: q.question,
        type: q.type,
        options: q.options as unknown as Prisma.InputJsonValue,
        explanation: q.explanation || null,
        points: q.points > 0 ? q.points : 1,
        order: i,
      },
    });
  }

  revalidatePath("/admin/courses");
  revalidatePath("/teacher/content");
  return { success: true as const };
}

/** Remove o quiz da aula. */
export async function deleteQuiz(lessonId: string) {
  await requireStaff();
  await db.quiz.deleteMany({ where: { lessonId } });
  revalidatePath("/admin/courses");
  revalidatePath("/teacher/content");
  return { success: true as const };
}

/**
 * Corrige a tentativa NO SERVIDOR (o cliente nunca recebe a resposta certa antes
 * de responder), grava a tentativa e conclui a aula se o aluno passar.
 */
export async function submitQuizAttempt(lessonId: string, answers: Record<string, string>) {
  const session = await auth();
  if (!session?.user) return { success: false as const, error: "Faça login para responder." };
  const userId = session.user.id;

  const quiz = await db.quiz.findUnique({
    where: { lessonId },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  if (!quiz || quiz.questions.length === 0) return { success: false as const, error: "Quiz não encontrado." };

  if (quiz.maxAttempts > 0) {
    const used = await db.quizAttempt.count({ where: { quizId: quiz.id, userId } });
    if (used >= quiz.maxAttempts) {
      return { success: false as const, error: `Você já usou suas ${quiz.maxAttempts} tentativa(s).` };
    }
  }

  let earned = 0;
  let total = 0;
  const results = quiz.questions.map((q) => {
    const options = (q.options as unknown as QuizOption[]) ?? [];
    const correct = options.find((o) => o.isCorrect);
    const chosenId = answers[q.id] ?? null;
    const isRight = !!correct && chosenId === correct.id;
    total += q.points;
    if (isRight) earned += q.points;
    return {
      questionId: q.id,
      isRight,
      chosenOptionId: chosenId,
      correctOptionId: quiz.showAnswers ? correct?.id ?? null : null,
      explanation: quiz.showAnswers ? q.explanation : null,
    };
  });

  const score = total > 0 ? Math.round((earned / total) * 100) : 0;
  const passed = score >= quiz.passingScore;

  await db.quizAttempt.create({
    data: { quizId: quiz.id, userId, answers: answers as Prisma.InputJsonValue, score, passed },
  });

  let awardedXp = 0;
  if (passed) {
    const result = await markLessonComplete(lessonId);
    if (result.success) awardedXp = result.awardedXp ?? 0;
  }

  const attemptsUsed = await db.quizAttempt.count({ where: { quizId: quiz.id, userId } });

  return {
    success: true as const,
    score,
    passed,
    passingScore: quiz.passingScore,
    awardedXp,
    attemptsUsed,
    maxAttempts: quiz.maxAttempts,
    results,
  };
}
