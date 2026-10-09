export const dynamic = "force-dynamic";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarCheck, Layers } from "lucide-react";
import { requireArea } from "@/lib/auth-guards";
import { db } from "@/lib/db";
import { canStudyCourse, loadStudySession, nextDueAt, parseStudyMode } from "@/lib/flashcards/queries";
import { StudySession } from "@/components/flashcards/study-session";

const MODE_TITLE = { inteligente: "Revisão do dia", erros: "Revisando seus erros", tudo: "Treino livre" } as const;

// Sessão de flashcards: de um baralho (deck) ou do curso inteiro.
export default async function FlashcardsStudyPage(props: { searchParams: Promise<{ courseId?: string; deck?: string; modo?: string }> }) {
  const sp = await props.searchParams;
  const session = await requireArea("student");
  if (!sp.courseId || !(await canStudyCourse(session.user, sp.courseId))) redirect("/student/course");

  const courseId = sp.courseId;
  const mode = parseStudyMode(sp.modo);
  const deck = sp.deck ? await db.flashcardDeck.findFirst({ where: { id: sp.deck, courseId, isPublished: true }, select: { id: true, title: true } }) : null;
  const cards = await loadStudySession(session.user.id, courseId, deck?.id ?? null, mode);
  const backHref = `/student/course?courseId=${courseId}&secao=flashcards`;
  const title = deck ? `${deck.title} · ${MODE_TITLE[mode]}` : MODE_TITLE[mode];

  if (cards.length === 0) {
    const next = mode === "inteligente" ? await nextDueAt(session.user.id, courseId) : null;
    return (
      <div className="mx-auto max-w-md py-10 text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-ok-soft text-ok-text dark:bg-ok/15 dark:text-ok">
          {mode === "inteligente" ? <CalendarCheck className="h-8 w-8" /> : <Layers className="h-8 w-8" />}
        </span>
        <h1 className="mt-4 text-[22px] font-extrabold text-foreground">{mode === "inteligente" ? "Tudo em dia por aqui!" : mode === "erros" ? "Nenhum erro para revisar" : "Nenhum cartão ainda"}</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          {mode === "inteligente"
            ? next ? `A próxima revisão abre ${next.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit", timeZone: "America/Fortaleza" })}. Quer treinar mesmo assim?` : "Você não tem revisões pendentes. Que tal um treino livre?"
            : mode === "erros" ? "Você ainda não errou nenhum cartão aqui. Continue assim!" : "Este baralho ainda não tem cartões."}
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          {mode !== "tudo" && (
            <Link href={`/student/flashcards?courseId=${courseId}${deck ? `&deck=${deck.id}` : ""}&modo=tudo`} className="inline-flex h-11 items-center justify-center rounded-xl bg-brand px-5 text-sm font-bold text-white hover:bg-brand-dark">Treino livre</Link>
          )}
          <Link href={backHref} className="inline-flex h-11 items-center justify-center rounded-xl border border-line-strong px-5 text-sm font-bold text-foreground dark:border-white/10">Voltar aos baralhos</Link>
        </div>
      </div>
    );
  }

  return <StudySession courseId={courseId} cards={cards} title={title} backHref={backHref} />;
}
