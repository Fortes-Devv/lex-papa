import { describe, expect, it } from "vitest";
import { toStudentQuiz } from "./quiz";

describe("toStudentQuiz", () => {
  const raw = {
    title: "Fixação",
    description: null,
    passingScore: 70,
    questions: [
      { id: "q1", question: "2 + 2?", points: 1, options: [{ id: "a", text: "4", isCorrect: true }, { id: "b", text: "5", isCorrect: false }] },
    ],
  };

  it("nunca envia o gabarito (isCorrect) para o aluno", () => {
    const quiz = toStudentQuiz(raw);
    expect(JSON.stringify(quiz)).not.toContain("isCorrect");
    expect(quiz?.questions[0].options).toEqual([{ id: "a", text: "4" }, { id: "b", text: "5" }]);
  });

  it("quiz sem questões ou inexistente vira null", () => {
    expect(toStudentQuiz(null)).toBeNull();
    expect(toStudentQuiz({ ...raw, questions: [] })).toBeNull();
  });
});
