"use client";
import { useEffect, useState } from "react";
import { Send } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { askLessonQuestion, listLessonQuestions } from "@/lib/actions/learning";
import { formatRelativeDate, cn } from "@/lib/utils/cn";

type Item = Extract<Awaited<ReturnType<typeof listLessonQuestions>>, { success: true }>["items"][number];

// Aba "Dúvidas" da aula: alunos perguntam, professor/equipe responde no mesmo tópico.
export function LessonQuestions({ courseId, lessonId }: { courseId: string; lessonId: string }) {
  const { error } = useToast();
  const [items, setItems] = useState<Item[] | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [denied, setDenied] = useState<string | null>(null);

  async function load() {
    const res = await listLessonQuestions(courseId, lessonId);
    if (res.success) setItems(res.items);
    else setDenied(res.error);
  }
  useEffect(() => {
    setItems(null);
    setDenied(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, lessonId]);

  async function send() {
    setSending(true);
    const res = await askLessonQuestion(courseId, lessonId, text);
    setSending(false);
    if (!res.success) { error(res.error); return; }
    setText("");
    load();
  }

  if (denied) return <p className="py-6 text-center text-sm text-foreground-muted">{denied}</p>;

  return (
    <div className="space-y-4">
      {items === null ? (
        <p className="py-6 text-center text-sm text-foreground-muted">Carregando…</p>
      ) : items.length === 0 ? (
        <p className="py-4 text-center text-sm text-foreground-muted">Nenhuma dúvida nesta aula ainda. Seja o primeiro a perguntar.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((q) => (
            <li key={q.id} className={cn("flex gap-3 rounded-xl border p-3", q.isStaff ? "border-brand-border bg-brand-soft/50 dark:border-brand/30 dark:bg-brand/10" : "border-border bg-card")}>
              <Avatar src={q.authorAvatar ?? undefined} name={q.authorName} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-foreground-muted">
                  <b className="text-foreground">{q.isMine ? "Você" : q.authorName}</b>
                  {q.isStaff && <span className="ml-1.5 rounded bg-brand px-1.5 py-0.5 text-[10px] font-bold text-white">Professor</span>}
                  {" · "}{formatRelativeDate(q.createdAt)}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{q.content}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="rounded-xl border border-border bg-card p-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={2000}
          placeholder="Escreva sua dúvida sobre esta aula…"
          className="min-h-[90px] w-full resize-none bg-transparent text-sm text-foreground outline-none placeholder:text-foreground-muted"
        />
        <div className="flex justify-end">
          <Button size="sm" onClick={send} loading={sending} disabled={!text.trim()} leftIcon={<Send className="h-3.5 w-3.5" />}>Enviar</Button>
        </div>
      </div>
    </div>
  );
}
