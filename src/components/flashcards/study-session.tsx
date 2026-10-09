"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Check, Clock, Flame, Keyboard, PenLine, RotateCcw, Sparkles, Trophy, X, Zap } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils/cn";
import { reviewFlashcard } from "@/lib/actions/flashcards";
import { RATING_LABEL, intervalLabel, schedule, type Rating, type SrsState } from "@/lib/flashcards/srs";
import { clozeParts } from "@/lib/flashcards/format";
import type { StudyCard } from "@/lib/flashcards/queries";

type Verdict = "certo" | "errado";
interface Result { first: Rating; card: StudyCard }

const RATING_STYLE: Record<Rating, string> = {
  1: "bg-danger text-white hover:brightness-110",
  2: "bg-amber-500 text-white hover:brightness-110",
  3: "bg-ok text-white hover:brightness-110",
  4: "bg-sky-500 text-white hover:brightness-110",
};
const SWIPE = 110; // px para valer o arraste

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * A sessão de estudo: um cartão por vez, vira em 3D, o aluno se avalia e o
 * sistema agenda a próxima revisão. "Errei" devolve o cartão para o fim da fila
 * (volta 3 cartões depois) até acertar.
 *
 * Atalhos: espaço vira · 1-4 avaliam · ← errei · → bom · C / E no Certo ou Errado.
 * No celular: arrastar para a direita = bom/certo, para a esquerda = errei/errado.
 */
export function StudySession({ courseId, cards, title, backHref }: { courseId: string; cards: StudyCard[]; title: string; backHref: string }) {
  const { error } = useToast();
  const [queue, setQueue] = useState(cards);
  const [states, setStates] = useState<Record<string, SrsState>>(() => Object.fromEntries(cards.map((c) => [c.id, c.state])));
  const [flipped, setFlipped] = useState(false);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [typed, setTyped] = useState("");
  const [writeMode, setWriteMode] = useState(false);
  const [results, setResults] = useState<Record<string, Result>>({});
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [xp, setXp] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [showKeys, setShowKeys] = useState(false);
  const [round, setRound] = useState(0); // muda a chave do cartão para animar a entrada
  const cardStart = useRef(Date.now());
  const dragStart = useRef<{ x: number; y: number } | null>(null);

  const current = queue[0] ?? null;
  const total = cards.length;
  const doneCount = Object.keys(results).length;
  const finished = !current;
  const state = current ? states[current.id] : null;

  useEffect(() => {
    try { setWriteMode(localStorage.getItem("fcWriteMode") === "1"); } catch { /* sem storage */ }
  }, []);
  useEffect(() => {
    if (finished) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [finished]);

  const flip = useCallback(() => {
    if (!current || flipped) return;
    if (current.type === "certo_errado" && !verdict) return; // primeiro julga
    setFlipped(true);
  }, [current, flipped, verdict]);

  const rate = useCallback((rating: Rating) => {
    if (!current || !state) return;
    const spent = Math.round((Date.now() - cardStart.current) / 1000);
    const next = schedule(state, rating);
    setStates((s) => ({ ...s, [current.id]: next }));
    // Guarda a primeira resposta (é ela que conta no aproveitamento).
    setResults((r) => (r[current.id] ? r : { ...r, [current.id]: { first: rating, card: current } }));
    if (rating === 1) setCombo(0);
    else setCombo((c) => { const n = c + 1; setBestCombo((b) => Math.max(b, n)); return n; });

    setQueue((q) => {
      const [, ...rest] = q;
      if (rating !== 1) return rest;
      const again = { ...current, state: next };
      const at = Math.min(3, rest.length);
      return [...rest.slice(0, at), again, ...rest.slice(at)];
    });
    setFlipped(false);
    setVerdict(null);
    setTyped("");
    setDrag(null);
    setRound((n) => n + 1);
    cardStart.current = Date.now();

    reviewFlashcard({ courseId, cardId: current.id, rating, seconds: spent })
      .then((res) => {
        if (res.success) setXp((x) => x + res.xp);
        else error(res.error);
      })
      .catch(() => error("Não foi possível salvar sua resposta. Confira a internet."));
  }, [current, state, courseId, error]);

  const judge = useCallback((v: Verdict) => {
    if (!current || current.type !== "certo_errado" || verdict) return;
    setVerdict(v);
    setFlipped(true);
  }, [current, verdict]);

  const judgedRight = current?.type === "certo_errado" && verdict ? verdict === current.back : null;

  // Teclado
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement;
      if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") {
        if (e.key === "Enter" && !e.shiftKey && !flipped) { e.preventDefault(); flip(); }
        return;
      }
      if (!current) return;
      const k = e.key.toLowerCase();
      if (current.type === "certo_errado" && !verdict) {
        if (k === "c" || e.key === "ArrowRight") judge("certo");
        if (k === "e" || e.key === "ArrowLeft") judge("errado");
        return;
      }
      if (!flipped) {
        if (e.key === " " || e.key === "Enter") { e.preventDefault(); flip(); }
        return;
      }
      if (judgedRight === false) {
        if (e.key === " " || e.key === "Enter" || e.key === "1") { e.preventDefault(); rate(1); }
        return;
      }
      if (["1", "2", "3", "4"].includes(e.key)) rate(Number(e.key) as Rating);
      else if (e.key === "ArrowLeft" && judgedRight === null) rate(1);
      else if (e.key === "ArrowRight" || e.key === " " || e.key === "Enter") { e.preventDefault(); rate(3); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, flipped, verdict, judgedRight, flip, rate, judge]);

  // Arrastar (celular e mouse)
  function onPointerDown(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest("button, textarea, input, a")) return;
    dragStart.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); // segue o dedo mesmo saindo do cartão
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragStart.current) return;
    const x = e.clientX - dragStart.current.x;
    const y = e.clientY - dragStart.current.y;
    if (Math.abs(x) > 6) setDrag({ x, y: y * 0.3 });
  }
  function onPointerUp() {
    const d = drag;
    const started = dragStart.current;
    dragStart.current = null;
    if (!started) return; // começou num botão ou no campo de texto
    if (!d || Math.abs(d.x) < SWIPE) {
      if (!d) flip(); // toque simples vira
      setDrag(null);
      return;
    }
    const right = d.x > 0;
    if (current?.type === "certo_errado" && !verdict) { setDrag(null); judge(right ? "certo" : "errado"); return; }
    if (!flipped) { setDrag(null); flip(); return; }
    if (judgedRight === false) { rate(1); return; }
    rate(right ? 3 : judgedRight ? 2 : 1);
  }

  const swipeHint = drag && Math.abs(drag.x) > 30
    ? current?.type === "certo_errado" && !verdict
      ? drag.x > 0 ? { text: "CERTO", cls: "text-ok border-ok" } : { text: "ERRADO", cls: "text-danger border-danger" }
      : flipped ? drag.x > 0 ? { text: "BOM", cls: "text-ok border-ok" } : { text: judgedRight ? "DIFÍCIL" : "ERREI", cls: "text-danger border-danger" } : null
    : null;

  if (finished) {
    return <Summary results={Object.values(results)} total={total} seconds={seconds} xp={xp} bestCombo={bestCombo} backHref={backHref} courseId={courseId} />;
  }

  const remaining = queue.length;
  const progress = total ? Math.round((doneCount / total) * 100) : 0;
  const ratings: Rating[] = judgedRight ? [2, 3, 4] : [1, 2, 3, 4];

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-140px)] max-w-2xl flex-col">
      {/* Barra de topo */}
      <div className="flex items-center gap-3">
        <Link href={backHref} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-foreground-muted hover:bg-muted hover:text-foreground" aria-label="Sair da sessão">
          <X className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2 text-xs">
            <span className="truncate font-bold text-foreground">{title}</span>
            <span className="shrink-0 font-semibold text-foreground-muted">{doneCount}/{total}{remaining > total - doneCount ? ` · ${remaining - (total - doneCount)} para refazer` : ""}</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-line dark:bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-brand to-amber-400 transition-all duration-500" style={{ width: `${Math.max(3, progress)}%` }} />
          </div>
        </div>
        <span className="hidden shrink-0 items-center gap-1 text-xs font-semibold tabular-nums text-foreground-muted sm:inline-flex"><Clock className="h-3.5 w-3.5" />{fmtTime(seconds)}</span>
        {combo >= 3 && (
          <span key={combo} className="inline-flex shrink-0 animate-pop items-center gap-1 rounded-full bg-gradient-to-r from-brand to-amber-500 px-2.5 py-1 text-xs font-extrabold text-white shadow-[0_4px_12px_rgba(242,106,27,.35)]">
            <Flame className="h-3.5 w-3.5" /> {combo}
          </span>
        )}
      </div>

      {/* Cartão */}
      <div className="relative mt-6 flex-1 [perspective:1400px]">
        {/* Cartões "de baixo" para dar a ideia de pilha */}
        {remaining > 1 && <div aria-hidden className="absolute inset-x-6 -bottom-3 top-6 rounded-[22px] border border-border bg-card/70" />}
        {remaining > 2 && <div aria-hidden className="absolute inset-x-12 -bottom-6 top-12 rounded-[22px] border border-border bg-card/40" />}

        <div
          key={`${current.id}-${round}`}
          className={cn("relative animate-card-in touch-pan-y select-none", judgedRight === false && "animate-shake")}
          style={drag ? { transform: `translate(${drag.x}px, ${drag.y}px) rotate(${drag.x / 18}deg)`, transition: "none" } : { transition: "transform .3s cubic-bezier(.2,.8,.2,1)" }}
          onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={() => { dragStart.current = null; setDrag(null); }}
        >
          {swipeHint && (
            <span className={cn("pointer-events-none absolute left-1/2 top-6 z-20 -translate-x-1/2 rounded-lg border-4 bg-card/90 px-4 py-1 text-xl font-black tracking-widest", swipeHint.cls)}
              style={{ opacity: Math.min(1, (Math.abs(drag!.x) - 30) / 80) }}>{swipeHint.text}</span>
          )}

          <div className={cn("grid transition-transform duration-500 [transform-style:preserve-3d]", flipped && "[transform:rotateY(180deg)]")}>
            {/* Frente */}
            <CardFace className="[grid-area:1/1]">
              <FaceHeader card={current} label={current.type === "certo_errado" ? "Julgue o item" : current.type === "lacuna" ? "Complete a lei" : "Pergunta"} />
              <div className="flex flex-1 items-center justify-center py-6">
                <Front card={current} />
              </div>
              {current.type === "basic" && writeMode && (
                <textarea value={typed} onChange={(e) => setTyped(e.target.value)} rows={2} placeholder="Escreva sua resposta antes de virar (Enter vira)"
                  className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand" />
              )}
              {current.type !== "certo_errado" && <p className="mt-3 text-center text-xs font-semibold text-foreground-muted">Toque no cartão ou aperte espaço para ver a resposta</p>}
            </CardFace>

            {/* Verso */}
            <CardFace className="[grid-area:1/1] [transform:rotateY(180deg)]">
              <FaceHeader card={current} label={current.type === "certo_errado" ? "Gabarito" : "Resposta"} />
              <div className="flex flex-1 flex-col justify-center gap-4 py-5">
                {current.type === "certo_errado" ? (
                  <>
                    <div className={cn("mx-auto inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-extrabold",
                      judgedRight ? "bg-ok-soft text-ok-text dark:bg-ok/15 dark:text-ok" : "bg-danger-soft text-danger dark:bg-danger/15")}>
                      {judgedRight ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                      {judgedRight ? "Você acertou!" : "Não foi dessa vez"} · Item {current.back === "certo" ? "CERTO" : "ERRADO"}
                    </div>
                    <p className="text-center text-[15px] leading-relaxed text-foreground-muted">{current.front}</p>
                  </>
                ) : current.type === "lacuna" ? (
                  <Cloze text={current.front} reveal />
                ) : (
                  <>
                    {writeMode && typed.trim() && (
                      <div className="rounded-xl border border-dashed border-border bg-background p-3">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-foreground-muted">Sua resposta</p>
                        <p className="mt-0.5 whitespace-pre-line text-sm text-foreground">{typed}</p>
                      </div>
                    )}
                    <p className="whitespace-pre-line text-center text-[18px] font-semibold leading-relaxed text-foreground sm:text-[20px]">{current.back}</p>
                  </>
                )}
                {current.explanation && (
                  <div className="rounded-xl bg-brand-soft/70 p-3 text-sm leading-relaxed text-foreground dark:bg-brand/10">
                    <p className="mb-0.5 text-[11px] font-bold uppercase tracking-wider text-brand">Por quê</p>
                    <p className="whitespace-pre-line">{current.explanation}</p>
                  </div>
                )}
                {current.source && <p className="text-center text-xs font-semibold text-foreground-muted">Fonte: {current.source}</p>}
              </div>
            </CardFace>
          </div>
        </div>
      </div>

      {/* Ações */}
      <div className="sticky bottom-0 mt-8 bg-gradient-to-t from-background via-background to-transparent pb-3 pt-4">
        {current.type === "certo_errado" && !verdict ? (
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => judge("errado")} className="flex h-14 items-center justify-center gap-2 rounded-2xl border-2 border-danger/60 text-base font-extrabold text-danger transition hover:bg-danger hover:text-white active:scale-[.98]">
              <X className="h-5 w-5" /> Errado <kbd className="ml-1 hidden rounded bg-black/5 px-1.5 text-xs dark:bg-white/10 sm:inline">E</kbd>
            </button>
            <button type="button" onClick={() => judge("certo")} className="flex h-14 items-center justify-center gap-2 rounded-2xl border-2 border-ok/60 text-base font-extrabold text-ok-text transition hover:bg-ok hover:text-white active:scale-[.98] dark:text-ok">
              <Check className="h-5 w-5" /> Certo <kbd className="ml-1 hidden rounded bg-black/5 px-1.5 text-xs dark:bg-white/10 sm:inline">C</kbd>
            </button>
          </div>
        ) : !flipped ? (
          <button type="button" onClick={flip} className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-navy text-base font-extrabold text-white transition hover:bg-navy-soft active:scale-[.99] dark:bg-white dark:text-navy">
            <RotateCcw className="h-5 w-5" /> Mostrar resposta <kbd className="ml-1 hidden rounded bg-white/15 px-1.5 text-xs dark:bg-black/10 sm:inline">Espaço</kbd>
          </button>
        ) : judgedRight === false ? (
          <button type="button" onClick={() => rate(1)} className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-danger text-base font-extrabold text-white transition hover:brightness-110 active:scale-[.99]">
            Entendi, vou rever esse <kbd className="ml-1 hidden rounded bg-white/20 px-1.5 text-xs sm:inline">Espaço</kbd>
          </button>
        ) : (
          <>
            <p className="mb-2 text-center text-xs font-semibold text-foreground-muted">{judgedRight ? "Acertou! Quão fácil foi?" : "Como você foi?"}</p>
            <div className={cn("grid gap-2", ratings.length === 4 ? "grid-cols-4" : "grid-cols-3")}>
              {ratings.map((r) => (
                <button key={r} type="button" onClick={() => rate(r)}
                  className={cn("flex h-16 flex-col items-center justify-center rounded-2xl text-sm font-extrabold shadow-sm transition active:scale-[.97]", RATING_STYLE[r])}>
                  {RATING_LABEL[r]}
                  <span className="text-[11px] font-semibold opacity-85">{intervalLabel(schedule(state!, r).interval)}</span>
                </button>
              ))}
            </div>
          </>
        )}

        <div className="mt-3 flex items-center justify-center gap-4 text-xs font-semibold text-foreground-muted">
          {current.type === "basic" && (
            <button type="button" onClick={() => { const v = !writeMode; setWriteMode(v); try { localStorage.setItem("fcWriteMode", v ? "1" : "0"); } catch { /* sem storage */ } }}
              className={cn("inline-flex items-center gap-1 hover:text-foreground", writeMode && "text-brand")}>
              <PenLine className="h-3.5 w-3.5" /> Modo escrita {writeMode ? "ligado" : "desligado"}
            </button>
          )}
          <button type="button" onClick={() => setShowKeys((v) => !v)} className="hidden items-center gap-1 hover:text-foreground sm:inline-flex">
            <Keyboard className="h-3.5 w-3.5" /> Atalhos
          </button>
        </div>
        {showKeys && (
          <p className="mt-2 text-center text-xs text-foreground-muted">
            <b>Espaço</b> vira · <b>1-4</b> avaliam · <b>←</b> errei · <b>→</b> bom · <b>C</b>/<b>E</b> no Certo ou Errado · arraste o cartão para os lados
          </p>
        )}
      </div>
    </div>
  );
}

function CardFace({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("flex min-h-[340px] flex-col rounded-[22px] border border-border bg-card p-5 shadow-[0_18px_50px_rgba(31,43,58,.12)] [backface-visibility:hidden] sm:min-h-[380px] sm:p-7", className)}>
      {children}
    </div>
  );
}

function FaceHeader({ card, label }: { card: StudyCard; label: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="truncate rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold text-foreground-muted">{card.deckTitle}</span>
      <span className="flex shrink-0 items-center gap-1.5">
        {card.isNew && <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-extrabold uppercase text-sky-700 dark:bg-sky-500/15 dark:text-sky-300"><Sparkles className="h-3 w-3" /> Novo</span>}
        <span className="text-[11px] font-bold uppercase tracking-wider text-brand">{label}</span>
      </span>
    </div>
  );
}

function Front({ card }: { card: StudyCard }) {
  if (card.type === "lacuna") return <Cloze text={card.front} />;
  return (
    <p className={cn("whitespace-pre-line text-center font-bold leading-snug text-foreground",
      card.front.length > 220 ? "text-[16px] sm:text-[18px]" : "text-[20px] sm:text-[24px]")}>
      {card.front}
    </p>
  );
}

function Cloze({ text, reveal = false }: { text: string; reveal?: boolean }) {
  const parts = useMemo(() => clozeParts(text), [text]);
  return (
    <p className={cn("whitespace-pre-line text-center font-semibold leading-[2] text-foreground", text.length > 220 ? "text-[15px] sm:text-[17px]" : "text-[18px] sm:text-[21px]")}>
      {parts.map((p, i) => p.hidden ? (
        reveal
          ? <mark key={i} className="rounded-md bg-brand/15 px-1.5 py-0.5 font-extrabold text-brand">{p.text}</mark>
          : <span key={i} className="mx-0.5 inline-block rounded-md border-b-2 border-dashed border-brand bg-brand-soft/60 align-middle dark:bg-brand/10" style={{ width: `${Math.min(14, Math.max(3, p.text.length * 0.55))}em`, height: "1.3em" }} aria-label="lacuna" />
      ) : <span key={i}>{p.text}</span>)}
    </p>
  );
}

function Summary({ results, total, seconds, xp, bestCombo, backHref, courseId }: { results: Result[]; total: number; seconds: number; xp: number; bestCombo: number; backHref: string; courseId: string }) {
  const [again, setAgain] = useState<StudyCard[] | null>(null);
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0 } as Record<Rating, number>;
  results.forEach((r) => counts[r.first]++);
  const right = total - counts[1];
  const accuracy = total ? Math.round((right / total) * 100) : 0;
  const missed = results.filter((r) => r.first === 1).map((r) => ({ ...r.card, isNew: false }));
  const great = accuracy >= 80;
  const R = 54;
  const C = 2 * Math.PI * R;

  if (again) return <StudySession courseId={courseId} cards={again} title="Revisando os que você errou" backHref={backHref} />;

  return (
    <div className="relative mx-auto max-w-xl overflow-hidden py-4">
      {great && <Confetti />}
      <div className="animate-card-in rounded-[24px] border border-border bg-card p-6 text-center shadow-[0_18px_50px_rgba(31,43,58,.12)] sm:p-8">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand to-amber-400 text-white shadow-[0_8px_20px_rgba(242,106,27,.35)]"><Trophy className="h-6 w-6" /></span>
        <h1 className="mt-3 text-[24px] font-extrabold text-foreground">{great ? "Mandou muito bem!" : accuracy >= 50 ? "Bom treino!" : "Treino é isso: errar aqui para acertar na prova."}</h1>
        <p className="mt-1 text-sm text-foreground-muted">Sessão concluída · os cartões já estão agendados para a hora certa de revisar.</p>

        <div className="relative mx-auto mt-6 h-36 w-36">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
            <circle cx="60" cy="60" r={R} className="fill-none stroke-line dark:stroke-white/10" strokeWidth="10" />
            <circle cx="60" cy="60" r={R} className={cn("fill-none transition-[stroke-dashoffset] duration-1000", great ? "stroke-ok" : "stroke-brand")} strokeWidth="10" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={C * (1 - accuracy / 100)} />
          </svg>
          <div className="absolute inset-0 grid place-items-center">
            <div><p className="text-[32px] font-black leading-none text-foreground">{accuracy}%</p><p className="mt-1 text-xs font-semibold text-foreground-muted">de acerto</p></div>
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-3 gap-2">
          {[
            { icon: <Check className="h-4 w-4" />, v: `${right}/${total}`, l: "acertos" },
            { icon: <Clock className="h-4 w-4" />, v: fmtTime(seconds), l: "de estudo" },
            { icon: <Zap className="h-4 w-4" />, v: `+${xp}`, l: "XP" },
          ].map((s) => (
            <div key={s.l} className="rounded-xl bg-background p-3">
              <span className="mx-auto mb-1 grid h-7 w-7 place-items-center rounded-full bg-brand-soft text-brand dark:bg-brand/15">{s.icon}</span>
              <dd className="text-[17px] font-extrabold text-foreground">{s.v}</dd>
              <dt className="text-[11px] font-semibold text-foreground-muted">{s.l}</dt>
            </div>
          ))}
        </dl>

        {/* Distribuição das respostas */}
        <div className="mt-5 text-left">
          <div className="flex h-3 overflow-hidden rounded-full bg-line dark:bg-white/10">
            {([1, 2, 3, 4] as Rating[]).map((r) => counts[r] > 0 && (
              <div key={r} className={cn(RATING_STYLE[r].split(" ")[0])} style={{ width: `${(counts[r] / total) * 100}%` }} />
            ))}
          </div>
          <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs font-semibold text-foreground-muted">
            {([1, 2, 3, 4] as Rating[]).map((r) => (
              <span key={r} className="inline-flex items-center gap-1.5"><span className={cn("h-2.5 w-2.5 rounded-full", RATING_STYLE[r].split(" ")[0])} />{RATING_LABEL[r]} {counts[r]}</span>
            ))}
          </div>
        </div>

        {bestCombo >= 3 && (
          <p className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-brand to-amber-500 px-3 py-1 text-xs font-extrabold text-white">
            <Flame className="h-3.5 w-3.5" /> Melhor sequência: {bestCombo} acertos seguidos
          </p>
        )}

        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          {missed.length > 0 ? (
            <button type="button" onClick={() => setAgain(missed)} className="flex h-12 items-center justify-center gap-2 rounded-xl bg-brand text-sm font-extrabold text-white hover:bg-brand-dark">
              <RotateCcw className="h-4 w-4" /> Refazer os {missed.length} que errei
            </button>
          ) : (
            <Link href={`/student/flashcards?courseId=${courseId}&modo=tudo`} className="flex h-12 items-center justify-center gap-2 rounded-xl bg-brand text-sm font-extrabold text-white hover:bg-brand-dark">
              <Zap className="h-4 w-4" /> Treino livre
            </Link>
          )}
          <Link href={backHref} className="flex h-12 items-center justify-center rounded-xl border border-line-strong text-sm font-bold text-foreground hover:bg-background dark:border-white/10">
            Voltar aos baralhos
          </Link>
        </div>
      </div>
    </div>
  );
}

function Confetti() {
  const colors = ["#f26a1b", "#fbbf24", "#2fbf7a", "#38bdf8", "#a78bfa", "#f472b6"];
  const pieces = useMemo(() => Array.from({ length: 42 }, (_, i) => ({
    left: Math.random() * 100, delay: Math.random() * 0.8, size: 6 + Math.random() * 6, color: colors[i % colors.length], round: Math.random() > 0.5,
  })), []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {pieces.map((p, i) => (
        <span key={i} className="absolute top-0 animate-confetti" style={{ left: `${p.left}%`, width: p.size, height: p.size * (p.round ? 1 : 1.6), background: p.color, borderRadius: p.round ? 999 : 2, animationDelay: `${p.delay}s` }} />
      ))}
    </div>
  );
}
