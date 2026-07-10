import type { StudentQuiz } from "@/components/player/quiz-player";

interface RawOption { id: string; text: string; isCorrect: boolean }
interface RawQuiz {
  title: string;
  description: string | null;
  passingScore: number;
  questions: { id: string; question: string; points: number; options: unknown }[];
}

/**
 * Converte o quiz do banco no formato que o aluno recebe, REMOVENDO o campo
 * `isCorrect` de cada alternativa. A correção acontece só no servidor.
 */
export function toStudentQuiz(quiz: RawQuiz | null | undefined): StudentQuiz | null {
  if (!quiz || quiz.questions.length === 0) return null;
  return {
    title: quiz.title,
    description: quiz.description,
    passingScore: quiz.passingScore,
    questions: quiz.questions.map((q) => ({
      id: q.id,
      question: q.question,
      points: q.points,
      options: ((q.options as RawOption[] | null) ?? []).map((o) => ({ id: o.id, text: o.text })),
    })),
  };
}
