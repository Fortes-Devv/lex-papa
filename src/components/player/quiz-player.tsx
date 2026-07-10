"use client";
import { useState } from "react";
import { CheckCircle2, XCircle, Award, RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { submitQuizAttempt } from "@/lib/actions/quiz";

/** Questão como o aluno recebe: SEM a resposta correta. */
export interface StudentQuizQuestion {
  id: string;
  question: string;
  points: number;
  options: { id: string; text: string }[];
}
export interface StudentQuiz {
  title: string;
  description: string | null;
  passingScore: number;
  questions: StudentQuizQuestion[];
}

interface AttemptResult {
  score: number;
  passed: boolean;
  passingScore: number;
  awardedXp: number;
  attemptsUsed: number;
  maxAttempts: number;
  results: {
    questionId: string;
    isRight: boolean;
    chosenOptionId: string | null;
    correctOptionId: string | null;
    explanation: string | null;
  }[];
}

export function QuizPlayer({ lessonId, quiz, canSubmit = true, onPassed }: {
  lessonId: string;
  quiz: StudentQuiz;
  canSubmit?: boolean;
  onPassed?: (awardedXp: number) => void;
}) {
  const { error } = useToast();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AttemptResult | null>(null);

  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === quiz.questions.length;

  async function handleSubmit() {
    if (!allAnswered) { error("Responda todas as questões antes de enviar."); return; }
    setSubmitting(true);
    try {
      const res = await submitQuizAttempt(lessonId, answers);
      if (!res.success) { error(res.error); return; }
      setResult(res);
      if (res.passed) onPassed?.(res.awardedXp);
    } catch {
      error("Erro ao enviar suas respostas.");
    } finally {
      setSubmitting(false);
    }
  }

  function retry() {
    setAnswers({});
    setResult(null);
  }

  const resultFor = (questionId: string) => result?.results.find((r) => r.questionId === questionId);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-6">
      {/* Cabeçalho */}
      <div className="text-center">
        <span className="text-2xs font-bold uppercase tracking-wider text-primary">Quiz</span>
        <h1 className="mt-1 font-sans text-2xl font-bold text-foreground">{quiz.title}</h1>
        {quiz.description && <p className="mt-1 text-sm text-foreground-muted">{quiz.description}</p>}
        <p className="mt-2 text-xs text-foreground-muted">
          {quiz.questions.length} questões · nota mínima {quiz.passingScore}%
        </p>
      </div>

      {/* Resultado */}
      {result && (
        <div className={`rounded-xl border p-5 text-center ${result.passed ? "border-success/40 bg-success-muted/30" : "border-destructive/40 bg-destructive-muted/30"}`}>
          <div className={`mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full ${result.passed ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>
            {result.passed ? <Award className="h-6 w-6" /> : <XCircle className="h-6 w-6" />}
          </div>
          <p className="text-2xl font-extrabold text-foreground">{result.score}%</p>
          <p className={`mt-0.5 text-sm font-semibold ${result.passed ? "text-success" : "text-destructive"}`}>
            {result.passed ? "Aprovado!" : "Não atingiu a nota mínima"}
          </p>
          {result.awardedXp > 0 && <p className="mt-1 text-xs font-semibold text-success">+{result.awardedXp} XP</p>}
          <p className="mt-2 text-xs text-foreground-muted">
            Tentativa {result.attemptsUsed} de {result.maxAttempts}
          </p>
          {!result.passed && result.attemptsUsed < result.maxAttempts && (
            <Button size="sm" variant="outline" className="mt-3" onClick={retry} leftIcon={<RotateCcw className="h-3.5 w-3.5" />}>
              Tentar novamente
            </Button>
          )}
        </div>
      )}

      {/* Questões */}
      <div className="space-y-4">
        {quiz.questions.map((q, qi) => {
          const r = resultFor(q.id);
          return (
            <div key={q.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
                  {qi + 1}
                </span>
                <p className="flex-1 text-sm font-medium leading-snug text-foreground">{q.question}</p>
                {r && (r.isRight ? <CheckCircle2 className="h-5 w-5 shrink-0 text-success" /> : <XCircle className="h-5 w-5 shrink-0 text-destructive" />)}
              </div>

              <div className="mt-3 space-y-2 pl-10">
                {q.options.map((o) => {
                  const chosen = answers[q.id] === o.id;
                  // Após responder: destaca a correta (verde) e a errada escolhida (vermelha)
                  const isCorrect = r?.correctOptionId === o.id;
                  const isWrongChoice = r && r.chosenOptionId === o.id && !r.isRight;

                  return (
                    <button
                      key={o.id}
                      type="button"
                      disabled={!!result || !canSubmit}
                      onClick={() => setAnswers((a) => ({ ...a, [q.id]: o.id }))}
                      className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left text-sm transition-colors disabled:cursor-default ${
                        isCorrect
                          ? "border-success bg-success-muted/40 text-foreground"
                          : isWrongChoice
                          ? "border-destructive bg-destructive-muted/30 text-foreground"
                          : chosen
                          ? "border-primary bg-primary/5 text-foreground"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${chosen || isCorrect ? "border-primary" : "border-foreground-subtle"}`}>
                        {(chosen || isCorrect) && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                      </span>
                      {o.text}
                    </button>
                  );
                })}
              </div>

              {r?.explanation && (
                <p className="mt-3 rounded-lg bg-muted/40 p-3 pl-10 text-xs leading-relaxed text-foreground-muted">
                  <strong className="text-foreground">Explicação: </strong>{r.explanation}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Enviar */}
      {!result && (
        <div className="flex flex-col items-center gap-2">
          {!canSubmit ? (
            <p className="text-xs text-foreground-muted">Modo pré-visualização — respostas não são registradas.</p>
          ) : (
            <>
              <p className="text-xs text-foreground-muted">{answeredCount} de {quiz.questions.length} respondidas</p>
              <Button size="lg" onClick={handleSubmit} disabled={!allAnswered || submitting}>
                {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</> : "Enviar respostas"}
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
