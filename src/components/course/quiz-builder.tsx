"use client";
import { useEffect, useState } from "react";
import { Plus, Trash2, CheckCircle2, Loader2, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { getQuizForEdit, saveQuiz, deleteQuiz, type QuizOption, type QuizQuestionType } from "@/lib/actions/quiz";

interface BuilderQuestion {
  question: string;
  type: QuizQuestionType;
  options: QuizOption[];
  explanation: string;
  points: number;
}

const uid = () => Math.random().toString(36).slice(2, 9);

const emptyChoice = (): BuilderQuestion => ({
  question: "",
  type: "single_choice",
  options: [
    { id: uid(), text: "", isCorrect: true },
    { id: uid(), text: "", isCorrect: false },
  ],
  explanation: "",
  points: 1,
});

const trueFalse = (): BuilderQuestion => ({
  question: "",
  type: "true_false",
  options: [
    { id: uid(), text: "Verdadeiro", isCorrect: true },
    { id: uid(), text: "Falso", isCorrect: false },
  ],
  explanation: "",
  points: 1,
});

/** Editor do quiz de uma aula (tipo = quiz). Salva separado do formulário da aula. */
export function QuizBuilder({ lessonId }: { lessonId: string }) {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false); // a aula tem quiz?

  const [title, setTitle] = useState("");
  const [passingScore, setPassingScore] = useState(70);
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [showAnswers, setShowAnswers] = useState(true);
  const [questions, setQuestions] = useState<BuilderQuestion[]>([]);

  useEffect(() => {
    let active = true;
    getQuizForEdit(lessonId)
      .then((quiz) => {
        if (!active) return;
        if (quiz) {
          setEnabled(true);
          setTitle(quiz.title);
          setPassingScore(quiz.passingScore);
          setMaxAttempts(quiz.maxAttempts);
          setShowAnswers(quiz.showAnswers);
          setQuestions(quiz.questions.map((q) => ({ ...q, explanation: q.explanation ?? "" })));
        }
      })
      .catch(() => {})
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [lessonId]);

  function enableQuiz() {
    setEnabled(true);
    if (questions.length === 0) setQuestions([emptyChoice()]);
  }

  async function handleRemoveQuiz() {
    if (!confirm("Remover o quiz desta aula? As questões serão apagadas.")) return;
    setSaving(true);
    try {
      await deleteQuiz(lessonId);
      setEnabled(false);
      setQuestions([]);
      setTitle("");
      success("Quiz removido.");
    } catch {
      error("Erro ao remover o quiz.");
    } finally {
      setSaving(false);
    }
  }

  function updateQuestion(i: number, patch: Partial<BuilderQuestion>) {
    setQuestions((qs) => qs.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  }

  function setQuestionType(i: number, type: QuizQuestionType) {
    setQuestions((qs) =>
      qs.map((q, idx) => {
        if (idx !== i) return q;
        if (type === "true_false") return { ...q, type, options: trueFalse().options };
        return { ...q, type, options: q.options.length >= 2 ? q.options : emptyChoice().options };
      })
    );
  }

  function updateOption(qi: number, oi: number, patch: Partial<QuizOption>) {
    setQuestions((qs) =>
      qs.map((q, idx) => (idx === qi ? { ...q, options: q.options.map((o, j) => (j === oi ? { ...o, ...patch } : o)) } : q))
    );
  }

  /** Marca a alternativa correta (apenas uma por questão). */
  function markCorrect(qi: number, oi: number) {
    setQuestions((qs) =>
      qs.map((q, idx) => (idx === qi ? { ...q, options: q.options.map((o, j) => ({ ...o, isCorrect: j === oi })) } : q))
    );
  }

  function addOption(qi: number) {
    setQuestions((qs) => qs.map((q, idx) => (idx === qi ? { ...q, options: [...q.options, { id: uid(), text: "", isCorrect: false }] } : q)));
  }

  function removeOption(qi: number, oi: number) {
    setQuestions((qs) =>
      qs.map((q, idx) => {
        if (idx !== qi || q.options.length <= 2) return q;
        const options = q.options.filter((_, j) => j !== oi);
        if (!options.some((o) => o.isCorrect)) options[0].isCorrect = true;
        return { ...q, options };
      })
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      const result = await saveQuiz(lessonId, {
        title,
        passingScore,
        maxAttempts,
        showAnswers,
        questions: questions.map((q) => ({ ...q, explanation: q.explanation || undefined })),
      });
      if (!result.success) { error(result.error); return; }
      success("Quiz salvo.");
    } catch {
      error("Erro ao salvar o quiz.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-border py-8 text-sm text-foreground-muted">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando quiz...
      </div>
    );
  }

  // Sem quiz: card compacto convidando a adicionar (não mexe no tipo da aula).
  if (!enabled) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-muted/20 p-5 text-center">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <HelpCircle className="h-4 w-4" />
        </div>
        <p className="text-sm font-medium text-foreground">Quiz de fixação (opcional)</p>
        <p className="max-w-sm text-xs text-foreground-muted">
          Adicione questões para o aluno responder depois desta aula. O vídeo e o tipo da aula continuam como estão.
        </p>
        <Button size="sm" variant="outline" onClick={enableQuiz} leftIcon={<Plus className="h-3.5 w-3.5" />}>
          Adicionar quiz
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-lg border border-border bg-muted/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <HelpCircle className="h-4 w-4 text-primary" /> Quiz da aula
        </p>
        <div className="flex items-center gap-2">
          <Button size="xs" variant="ghost" onClick={handleRemoveQuiz} disabled={saving}>Remover quiz</Button>
          <Button size="xs" onClick={handleSave} loading={saving}>Salvar quiz</Button>
        </div>
      </div>

      <Input label="Título do quiz" placeholder="Ex: Fixação — Noções de Estado" value={title} onChange={(e) => setTitle(e.target.value)} />

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Nota mínima (%)" type="number" min="0" max="100"
          value={passingScore} onChange={(e) => setPassingScore(Number(e.target.value))}
        />
        <Input
          label="Tentativas" type="number" min="1"
          hint="Quantas vezes o aluno pode responder"
          value={maxAttempts} onChange={(e) => setMaxAttempts(Number(e.target.value))}
        />
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground-muted">
        <input type="checkbox" className="rounded border-border" checked={showAnswers} onChange={(e) => setShowAnswers(e.target.checked)} />
        Mostrar a resposta certa e a explicação após responder
      </label>

      {/* Questões */}
      <div className="space-y-3">
        {questions.map((q, qi) => (
          <div key={qi} className="space-y-3 rounded-lg border border-border bg-card p-3">
            <div className="flex items-start justify-between gap-2">
              <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-2xs font-bold text-primary">
                {qi + 1}
              </span>
              <div className="min-w-0 flex-1">
                <Textarea
                  placeholder="Enunciado da questão"
                  value={q.question}
                  onChange={(e) => updateQuestion(qi, { question: e.target.value })}
                />
              </div>
              <Button variant="ghost" size="icon-sm" onClick={() => setQuestions((qs) => qs.filter((_, i) => i !== qi))} title="Remover questão">
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Tipo"
                value={q.type}
                onChange={(e) => setQuestionType(qi, e.target.value as QuizQuestionType)}
                options={[
                  { value: "single_choice", label: "Múltipla escolha" },
                  { value: "true_false", label: "Verdadeiro ou Falso" },
                ]}
              />
              <Input label="Pontos" type="number" min="1" value={q.points} onChange={(e) => updateQuestion(qi, { points: Number(e.target.value) })} />
            </div>

            {/* Alternativas */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-foreground-muted">Alternativas (clique no ✓ para marcar a correta)</p>
              {q.options.map((o, oi) => (
                <div key={o.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => markCorrect(qi, oi)}
                    title="Marcar como correta"
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border transition-colors ${
                      o.isCorrect ? "border-success bg-success/10 text-success" : "border-border text-foreground-subtle hover:border-success/50"
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <Input
                      placeholder={`Alternativa ${oi + 1}`}
                      value={o.text}
                      disabled={q.type === "true_false"}
                      onChange={(e) => updateOption(qi, oi, { text: e.target.value })}
                    />
                  </div>
                  {q.type !== "true_false" && q.options.length > 2 && (
                    <Button variant="ghost" size="icon-sm" onClick={() => removeOption(qi, oi)} title="Remover alternativa">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
              {q.type !== "true_false" && (
                <Button size="xs" variant="ghost" onClick={() => addOption(qi)} leftIcon={<Plus className="h-3 w-3" />}>
                  Alternativa
                </Button>
              )}
            </div>

            <Input
              label="Explicação (opcional)"
              placeholder="Aparece para o aluno depois que ele responde"
              value={q.explanation}
              onChange={(e) => updateQuestion(qi, { explanation: e.target.value })}
            />
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => setQuestions((qs) => [...qs, emptyChoice()])} leftIcon={<Plus className="h-3.5 w-3.5" />}>
          Múltipla escolha
        </Button>
        <Button size="sm" variant="outline" onClick={() => setQuestions((qs) => [...qs, trueFalse()])} leftIcon={<Plus className="h-3.5 w-3.5" />}>
          Verdadeiro ou Falso
        </Button>
      </div>
    </div>
  );
}
