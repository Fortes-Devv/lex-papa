"use client";
import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Check, FileUp, Layers, Pencil, Plus, Search, Sparkles, Trash2, Wand2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils/cn";
import { CARD_TYPES, clozeParts, parseBulk, validateCard, type CardInput, type FlashcardType } from "@/lib/flashcards/format";
import { createDeck, createDecksFromDisciplines, deleteCard, deleteDeck, importCards, moveDeck, saveCard, updateDeck } from "@/lib/actions/flashcards";

export interface AdminCard extends CardInput { id: string }
export interface AdminDeck { id: string; title: string; description: string | null; isPublished: boolean; cards: AdminCard[] }

const TYPE_BADGE: Record<FlashcardType, string> = {
  basic: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  certo_errado: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  lacuna: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
};
const TYPE_SHORT: Record<FlashcardType, string> = { basic: "Pergunta", certo_errado: "C/E", lacuna: "Lacuna" };
const inputCls = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand";

const IMPORT_EXAMPLE = `# Um cartão por linha. Separe os campos com ;; (ou cole direto da planilha).
Qual o prazo para impetrar habeas corpus? ;; Não há prazo ;; Pode ser impetrado a qualquer tempo
E ;; O STF é composto por 13 ministros. ;; São 11 ministros (art. 101, CF) ;; CESPE 2023
C ;; A Constituição de 1988 é classificada como rígida.
A casa é {{asilo inviolável}} do indivíduo ;; ;; Art. 5º, XI, CF`;

/** FlashCards no admin: baralhos do curso à esquerda, cartões do baralho à direita. */
export function AdminFlashcards({ courseId, decks }: { courseId: string; decks: AdminDeck[] }) {
  const router = useRouter();
  const { success, error } = useToast();
  const [pending, start] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(decks[0]?.id ?? null);
  const [newDeck, setNewDeck] = useState("");
  const selected = decks.find((d) => d.id === selectedId) ?? decks[0] ?? null;

  function run<T extends { success: boolean; error?: string }>(fn: () => Promise<T>, ok?: string | ((r: T) => string), after?: (r: T) => void) {
    start(async () => {
      const r = await fn();
      if (!r.success) { error(r.error ?? "Não foi possível salvar."); return; }
      if (ok) success(typeof ok === "string" ? ok : ok(r));
      after?.(r);
      router.refresh();
    });
  }

  const totalCards = decks.reduce((s, d) => s + d.cards.length, 0);

  return (
    <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
      {/* Baralhos */}
      <aside className="space-y-3">
        <div className="rounded-[14px] border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-bold text-foreground">Baralhos</h2>
            <span className="text-xs font-semibold text-foreground-muted">{decks.length} · {totalCards} cartões</span>
          </div>
          <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (!newDeck.trim()) return; run(() => createDeck(courseId, newDeck), "Baralho criado.", (r) => { setNewDeck(""); if ("deckId" in r) setSelectedId(r.deckId as string); }); }}>
            <input value={newDeck} onChange={(e) => setNewDeck(e.target.value)} placeholder="Ex.: Direito Constitucional" className={cn(inputCls, "h-9 py-0")} />
            <Button type="submit" size="icon" disabled={pending || !newDeck.trim()} aria-label="Criar baralho"><Plus className="h-4 w-4" /></Button>
          </form>
          <button type="button" disabled={pending}
            onClick={() => run(() => createDecksFromDisciplines(courseId), (r) => ("created" in r && r.created ? `${r.created} baralho(s) criados a partir das disciplinas.` : "Todas as disciplinas já têm baralho."))}
            className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-violet-300 py-2 text-[13px] font-semibold text-violet-700 transition hover:bg-violet-50 disabled:opacity-50 dark:border-violet-500/40 dark:text-violet-300 dark:hover:bg-violet-500/10">
            <Wand2 className="h-3.5 w-3.5" /> Criar um baralho por disciplina
          </button>
        </div>

        {decks.length > 0 && (
          <ul className="overflow-hidden rounded-[14px] border border-border bg-card">
            {decks.map((d, i) => (
              <li key={d.id} className={cn("group flex items-center gap-2 border-b border-border px-3 py-2.5 last:border-0", d.id === selected?.id && "bg-violet-50 dark:bg-violet-500/10")}>
                <button type="button" onClick={() => setSelectedId(d.id)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
                  <span className={cn("h-2 w-2 shrink-0 rounded-full", d.isPublished ? "bg-ok" : "bg-foreground-muted/40")} title={d.isPublished ? "Publicado" : "Rascunho"} />
                  <span className="min-w-0">
                    <span className={cn("block truncate text-sm text-foreground", d.id === selected?.id ? "font-bold" : "font-semibold")}>{d.title}</span>
                    <span className="block text-xs text-foreground-muted">{d.cards.length} cart{d.cards.length !== 1 ? "ões" : "ão"}{d.isPublished ? "" : " · rascunho"}</span>
                  </span>
                </button>
                <span className="flex shrink-0 opacity-0 transition group-hover:opacity-100">
                  <button type="button" disabled={pending || i === 0} onClick={() => run(() => moveDeck(d.id, -1))} className="rounded p-1 text-foreground-muted hover:bg-muted disabled:opacity-30" aria-label="Subir"><ArrowUp className="h-3.5 w-3.5" /></button>
                  <button type="button" disabled={pending || i === decks.length - 1} onClick={() => run(() => moveDeck(d.id, 1))} className="rounded p-1 text-foreground-muted hover:bg-muted disabled:opacity-30" aria-label="Descer"><ArrowDown className="h-3.5 w-3.5" /></button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </aside>

      {/* Baralho aberto */}
      {selected ? (
        <DeckEditor key={selected.id} deck={selected} pending={pending} run={run} onDeleted={() => setSelectedId(null)} />
      ) : (
        <div className="rounded-[14px] border border-dashed border-border bg-card p-10 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300"><Layers className="h-7 w-7" /></span>
          <h2 className="mt-4 text-lg font-extrabold text-foreground">Comece pelos baralhos</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-foreground-muted">Crie um baralho por disciplina com um clique (usa os títulos dos módulos) ou dê o nome que quiser. Depois é só adicionar ou importar os cartões.</p>
        </div>
      )}
    </div>
  );
}

type Run = <T extends { success: boolean; error?: string }>(fn: () => Promise<T>, ok?: string | ((r: T) => string), after?: (r: T) => void) => void;

function DeckEditor({ deck, pending, run, onDeleted }: { deck: AdminDeck; pending: boolean; run: Run; onDeleted: () => void }) {
  const [title, setTitle] = useState(deck.title);
  const [tab, setTab] = useState<"cards" | "import">(deck.cards.length ? "cards" : "import");
  const [editing, setEditing] = useState<AdminCard | "new" | null>(null);
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<FlashcardType | "all">("all");

  const shown = deck.cards.filter((c) =>
    (typeFilter === "all" || c.type === typeFilter) &&
    (!q.trim() || `${c.front} ${c.back} ${c.explanation ?? ""}`.toLowerCase().includes(q.trim().toLowerCase())));
  const counts = { basic: 0, certo_errado: 0, lacuna: 0 } as Record<FlashcardType, number>;
  deck.cards.forEach((c) => counts[c.type]++);

  return (
    <section className="min-w-0 space-y-3">
      <div className="rounded-[14px] border border-border bg-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)}
            onBlur={() => { if (title.trim() && title !== deck.title) run(() => updateDeck(deck.id, { title }), "Nome salvo."); }}
            className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-1 py-0.5 text-[19px] font-extrabold text-foreground hover:border-border focus:border-brand focus:outline-none" aria-label="Nome do baralho" />
          <Switch checked={deck.isPublished} disabled={pending} onChange={(v) => run(() => updateDeck(deck.id, { isPublished: v }), v ? "Baralho publicado: os alunos já veem." : "Baralho voltou para rascunho.")}
            label={deck.isPublished ? "Publicado" : "Rascunho"} />
          <button type="button" disabled={pending}
            onClick={() => { if (confirm(`Excluir o baralho "${deck.title}" e os ${deck.cards.length} cartões? O progresso dos alunos nele também some.`)) run(() => deleteDeck(deck.id), "Baralho excluído.", onDeleted); }}
            className="rounded-lg p-2 text-foreground-muted hover:bg-danger-soft hover:text-danger dark:hover:bg-danger/15" aria-label="Excluir baralho"><Trash2 className="h-4 w-4" /></button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5 px-1">
          {CARD_TYPES.map((t) => <span key={t.id} className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", TYPE_BADGE[t.id])}>{counts[t.id]} {TYPE_SHORT[t.id]}</span>)}
          {!deck.isPublished && deck.cards.length > 0 && <span className="text-[11px] font-semibold text-foreground-muted">· publique para os alunos verem</span>}
        </div>
        <div className="mt-4 flex gap-1 rounded-lg bg-muted p-1">
          {([["cards", `Cartões (${deck.cards.length})`], ["import", "Importar em massa"]] as const).map(([id, label]) => (
            <button key={id} type="button" onClick={() => setTab(id)}
              className={cn("flex-1 rounded-md py-1.5 text-[13px] font-semibold transition", tab === id ? "bg-card text-foreground shadow-sm" : "text-foreground-muted hover:text-foreground")}>{label}</button>
          ))}
        </div>
      </div>

      {tab === "import" ? (
        <ImportPanel deckId={deck.id} pending={pending} run={run} onDone={() => setTab("cards")} />
      ) : (
        <>
          {editing ? (
            <CardForm deckId={deck.id} card={editing === "new" ? null : editing} pending={pending} run={run} onClose={() => setEditing(null)} />
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => setEditing("new")} leftIcon={<Plus className="h-4 w-4" />}>Novo cartão</Button>
              <div className="relative min-w-[180px] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar nos cartões" className={cn(inputCls, "h-9 py-0 pl-9")} />
              </div>
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as FlashcardType | "all")} className={cn(inputCls, "h-9 w-auto py-0")}>
                <option value="all">Todos os tipos</option>
                {CARD_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
          )}

          <ul className="space-y-2">
            {shown.map((c, i) => (
              <li key={c.id} className="group rounded-[12px] border border-border bg-card p-3.5 transition hover:border-violet-300 dark:hover:border-violet-500/40">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 w-6 shrink-0 text-right text-xs font-bold text-foreground-muted">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", TYPE_BADGE[c.type])}>{TYPE_SHORT[c.type]}</span>
                      {c.type === "certo_errado" && (
                        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-extrabold", c.back === "certo" ? "bg-ok-soft text-ok-text dark:bg-ok/15 dark:text-ok" : "bg-danger-soft text-danger dark:bg-danger/15")}>{c.back === "certo" ? "CERTO" : "ERRADO"}</span>
                      )}
                      {c.source && <span className="truncate text-[11px] text-foreground-muted">{c.source}</span>}
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm font-semibold text-foreground">
                      {c.type === "lacuna" ? clozeParts(c.front).map((p, k) => p.hidden ? <mark key={k} className="rounded bg-amber-100 px-1 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200">{p.text}</mark> : <span key={k}>{p.text}</span>) : c.front}
                    </p>
                    {c.type === "basic" && <p className="mt-0.5 line-clamp-2 text-sm text-foreground-muted">→ {c.back}</p>}
                    {c.explanation && <p className="mt-0.5 line-clamp-1 text-xs text-foreground-muted">Por quê: {c.explanation}</p>}
                  </div>
                  <span className="flex shrink-0 gap-0.5">
                    <button type="button" onClick={() => setEditing(c)} className="rounded p-1.5 text-foreground-muted hover:bg-muted hover:text-foreground" aria-label="Editar"><Pencil className="h-3.5 w-3.5" /></button>
                    <button type="button" disabled={pending} onClick={() => { if (confirm("Excluir este cartão?")) run(() => deleteCard(c.id), "Cartão excluído."); }}
                      className="rounded p-1.5 text-foreground-muted hover:bg-danger-soft hover:text-danger dark:hover:bg-danger/15" aria-label="Excluir"><Trash2 className="h-3.5 w-3.5" /></button>
                  </span>
                </div>
              </li>
            ))}
            {deck.cards.length === 0 && !editing && (
              <li className="rounded-[12px] border border-dashed border-border p-8 text-center text-sm text-foreground-muted">
                Nenhum cartão ainda. Crie um por um ou use <button type="button" onClick={() => setTab("import")} className="font-semibold text-brand hover:underline">Importar em massa</button> para colar vários de uma vez.
              </li>
            )}
            {deck.cards.length > 0 && shown.length === 0 && <li className="p-6 text-center text-sm text-foreground-muted">Nenhum cartão com esse filtro.</li>}
          </ul>
        </>
      )}
    </section>
  );
}

function CardForm({ deckId, card, pending, run, onClose }: { deckId: string; card: AdminCard | null; pending: boolean; run: Run; onClose: () => void }) {
  const [c, setC] = useState<CardInput>(card ?? { type: "basic", front: "", back: "", explanation: "", source: "" });
  const [another, setAnother] = useState(true);
  const frontRef = useRef<HTMLTextAreaElement>(null);
  const set = (patch: Partial<CardInput>) => setC((prev) => ({ ...prev, ...patch }));
  const err = validateCard(c);

  function changeType(type: FlashcardType) {
    set({ type, back: type === "certo_errado" ? (c.back === "errado" ? "errado" : "certo") : type === "lacuna" ? "" : c.back === "certo" || c.back === "errado" ? "" : c.back });
  }
  // Lacuna: envolve o trecho selecionado em {{ }}.
  function markCloze() {
    const el = frontRef.current;
    if (!el) return;
    const { selectionStart: a, selectionEnd: b } = el;
    if (a === b) return;
    set({ front: `${c.front.slice(0, a)}{{${c.front.slice(a, b)}}}${c.front.slice(b)}` });
  }
  function submit() {
    if (err) return;
    run(() => saveCard(deckId, card?.id ?? null, c), card ? "Cartão salvo." : "Cartão criado.", () => {
      if (!card && another) { setC({ type: c.type, front: "", back: c.type === "certo_errado" ? "certo" : "", explanation: "", source: c.source }); frontRef.current?.focus(); }
      else onClose();
    });
  }

  return (
    <div className="animate-scale-in rounded-[14px] border-2 border-violet-300 bg-card p-4 dark:border-violet-500/40" onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submit(); if (e.key === "Escape") onClose(); }}>
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-bold text-foreground">{card ? "Editar cartão" : "Novo cartão"}</h3>
        <button type="button" onClick={onClose} className="rounded p-1 text-foreground-muted hover:bg-muted" aria-label="Fechar"><X className="h-4 w-4" /></button>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {CARD_TYPES.map((t) => (
          <button key={t.id} type="button" onClick={() => changeType(t.id)}
            className={cn("rounded-xl border-2 p-2.5 text-left transition", c.type === t.id ? "border-violet-500 bg-violet-50 dark:bg-violet-500/10" : "border-border hover:border-violet-300")}>
            <span className="block text-[13px] font-bold text-foreground">{t.label}</span>
            <span className="mt-0.5 block text-[11px] leading-snug text-foreground-muted">{t.hint}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 flex items-center justify-between text-[13px] font-semibold text-foreground">
              {c.type === "certo_errado" ? "Afirmação para julgar" : c.type === "lacuna" ? "Texto (marque os trechos escondidos)" : "Frente: a pergunta"}
              {c.type === "lacuna" && (
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={markCloze} className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800 hover:bg-amber-200 dark:bg-amber-500/15 dark:text-amber-200">
                  <Sparkles className="h-3 w-3" /> Esconder seleção
                </button>
              )}
            </span>
            <textarea ref={frontRef} autoFocus value={c.front} onChange={(e) => set({ front: e.target.value })} rows={c.type === "lacuna" ? 4 : 3}
              placeholder={c.type === "certo_errado" ? "Ex.: O mandado de segurança pode ser impetrado no prazo de 180 dias." : c.type === "lacuna" ? "Ex.: A casa é {{asilo inviolável}} do indivíduo. Selecione um trecho e clique em Esconder seleção." : "Ex.: Quais são os remédios constitucionais?"}
              className={inputCls} />
          </label>

          {c.type === "basic" && (
            <label className="block">
              <span className="mb-1 block text-[13px] font-semibold text-foreground">Verso: a resposta</span>
              <textarea value={c.back} onChange={(e) => set({ back: e.target.value })} rows={3} placeholder="Ex.: HC, HD, MS, MI, ação popular e ACP" className={inputCls} />
            </label>
          )}
          {c.type === "certo_errado" && (
            <div>
              <span className="mb-1 block text-[13px] font-semibold text-foreground">Gabarito</span>
              <div className="grid grid-cols-2 gap-2">
                {(["certo", "errado"] as const).map((v) => (
                  <button key={v} type="button" onClick={() => set({ back: v })}
                    className={cn("flex h-11 items-center justify-center gap-1.5 rounded-xl border-2 text-sm font-extrabold transition",
                      c.back === v ? v === "certo" ? "border-ok bg-ok text-white" : "border-danger bg-danger text-white" : "border-border text-foreground-muted hover:border-foreground-muted")}>
                    {v === "certo" ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />} {v === "certo" ? "Certo" : "Errado"}
                  </button>
                ))}
              </div>
            </div>
          )}

          <label className="block">
            <span className="mb-1 block text-[13px] font-semibold text-foreground">Por quê <span className="font-normal text-foreground-muted">(opcional, aparece depois da resposta)</span></span>
            <textarea value={c.explanation ?? ""} onChange={(e) => set({ explanation: e.target.value })} rows={2} placeholder="Justificativa, pegadinha da banca, dica de memorização…" className={inputCls} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[13px] font-semibold text-foreground">Fonte <span className="font-normal text-foreground-muted">(opcional)</span></span>
            <input value={c.source ?? ""} onChange={(e) => set({ source: e.target.value })} placeholder="Ex.: Art. 5º, LXIX, CF · CESPE 2023" className={inputCls} />
          </label>
        </div>

        {/* Prévia */}
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-foreground-muted">Prévia para o aluno</p>
          <div className="rounded-xl border border-border bg-background p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-brand">{c.type === "certo_errado" ? "Julgue o item" : c.type === "lacuna" ? "Complete a lei" : "Pergunta"}</p>
            <p className="mt-1.5 whitespace-pre-line text-sm font-bold leading-relaxed text-foreground">
              {c.type === "lacuna"
                ? clozeParts(c.front).map((p, k) => p.hidden ? <span key={k} className="mx-0.5 inline-block h-[1.1em] rounded border-b-2 border-dashed border-brand bg-brand-soft align-middle dark:bg-brand/10" style={{ width: `${Math.min(10, Math.max(2, p.text.length * 0.5))}em` }} /> : <span key={k}>{p.text}</span>)
                : c.front || <span className="font-normal text-foreground-muted">…</span>}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-background p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-brand">{c.type === "certo_errado" ? "Gabarito" : "Resposta"}</p>
            <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-foreground">
              {c.type === "certo_errado" ? <b className={c.back === "certo" ? "text-ok-text dark:text-ok" : "text-danger"}>Item {c.back === "certo" ? "CERTO" : "ERRADO"}</b>
                : c.type === "lacuna" ? clozeParts(c.front).map((p, k) => p.hidden ? <mark key={k} className="rounded bg-brand/15 px-1 font-bold text-brand">{p.text}</mark> : <span key={k}>{p.text}</span>)
                : c.back || <span className="text-foreground-muted">…</span>}
            </p>
            {c.explanation && <p className="mt-2 border-t border-border pt-2 text-xs text-foreground-muted">{c.explanation}</p>}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
        {!card ? (
          <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-foreground-muted">
            <input type="checkbox" checked={another} onChange={(e) => setAnother(e.target.checked)} className="accent-[#7c3aed]" /> Continuar criando depois de salvar
          </label>
        ) : <span />}
        <div className="flex items-center gap-2">
          {err && c.front && <span className="text-xs text-danger">{err}</span>}
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="button" onClick={submit} disabled={!!err || pending} loading={pending}>{card ? "Salvar" : "Criar cartão"} <kbd className="ml-1 hidden rounded bg-white/20 px-1 text-[10px] sm:inline">Ctrl+Enter</kbd></Button>
        </div>
      </div>
    </div>
  );
}

function ImportPanel({ deckId, pending, run, onDone }: { deckId: string; pending: boolean; run: Run; onDone: () => void }) {
  const [text, setText] = useState("");
  const parsed = useMemo(() => parseBulk(text), [text]);
  const byType = parsed.cards.reduce((acc, c) => ({ ...acc, [c.type]: (acc[c.type] ?? 0) + 1 }), {} as Partial<Record<FlashcardType, number>>);

  return (
    <div className="rounded-[14px] border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300"><FileUp className="h-5 w-5" /></span>
        <div className="text-sm text-foreground-muted">
          <p className="font-bold text-foreground">Cole vários cartões de uma vez</p>
          <p className="mt-0.5">Um por linha, campos separados por <code className="rounded bg-muted px-1">;;</code> ou colados direto do Excel/Google Planilhas.</p>
          <ul className="mt-2 space-y-0.5 text-xs">
            <li><b className="text-foreground">Pergunta:</b> pergunta ;; resposta ;; por quê ;; fonte</li>
            <li><b className="text-foreground">Certo ou Errado:</b> C (ou E) ;; afirmação ;; por quê ;; fonte</li>
            <li><b className="text-foreground">Lacuna:</b> texto com {"{{trecho escondido}}"} ;; por quê ;; fonte</li>
          </ul>
        </div>
      </div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={12} placeholder={IMPORT_EXAMPLE} className={cn(inputCls, "mt-3 font-mono text-[13px] leading-relaxed")} />
      {!text && <button type="button" onClick={() => setText(IMPORT_EXAMPLE)} className="mt-1 text-xs font-semibold text-brand hover:underline">Usar o exemplo</button>}

      {text.trim() && (
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-[13px]">
            <span className="font-bold text-foreground">{parsed.cards.length} cartões prontos</span>
            {(Object.entries(byType) as [FlashcardType, number][]).map(([t, n]) => <span key={t} className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", TYPE_BADGE[t])}>{n} {TYPE_SHORT[t]}</span>)}
            {parsed.errors.length > 0 && <span className="font-semibold text-danger">· {parsed.errors.length} linha(s) com problema</span>}
          </div>
          {parsed.errors.length > 0 && (
            <ul className="max-h-28 overflow-auto rounded-lg bg-danger-soft p-2 text-xs text-danger dark:bg-danger/10">
              {parsed.errors.slice(0, 30).map((e) => <li key={e}>{e}</li>)}
            </ul>
          )}
        </div>
      )}

      <div className="mt-3 flex justify-end">
        <Button type="button" disabled={pending || parsed.cards.length === 0} loading={pending}
          onClick={() => run(() => importCards(deckId, text), (r) => `${"created" in r ? r.created : 0} cartões importados.`, () => { setText(""); onDone(); })}>
          Importar {parsed.cards.length || ""} cartões
        </Button>
      </div>
    </div>
  );
}
