"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { Moon, Sun, Search, Bell, Menu, ChevronDown, ChevronLeft, ChevronRight, Plus, LogOut, UserCircle } from "lucide-react";
import { Dropdown } from "@/components/ui/dropdown";
import { BottomSheet } from "@/components/course/module-board/bottom-sheet";
import { cn } from "@/lib/utils/cn";
import { ADMIN_BOTTOM, ADMIN_SECTIONS, activeSection, type NavFilter, type NavSection } from "./sections";

export interface PanelRecent { href: string; title: string; subtitle: string; mark: string }
export type PanelData = Record<string, { counts?: Record<string, number>; recents?: PanelRecent[]; footer?: { label: string; value: string } }>;

interface NavShellProps {
  area: "admin";
  user: { name: string; roleLabel: string };
  pendingOrders?: number;
  panelData?: PanelData;
  children: React.ReactNode;
}

const PROFILE_PATH = { admin: "/admin/profile" } as const;

// Telas de detalhe têm o próprio cabeçalho no celular (‹ voltar · título · ⋯).
const DETAIL_ROUTES = [/^\/admin\/courses\/[^/]+$/];

// Parâmetros de URL de um grupo de filtros.
const groupParams = (filters: NavFilter[]) => Array.from(new Set(filters.map((f) => f.param).filter(Boolean))) as string[];

function isFilterActive(f: NavFilter, params: URLSearchParams, gParams: string[]) {
  if (f.value === undefined) return gParams.every((p) => !params.get(p)); // "Todos"
  if (f.isDefault && !params.get(f.param!)) return true;
  return params.get(f.param!) === f.value;
}

// Link do filtro: troca só o parâmetro do próprio grupo e mantém os outros (e a busca).
// `toggle`: clicar num filtro já ativo de um grupo extra o desliga.
function filterHref(section: NavSection, f: NavFilter, params: URLSearchParams, gParams: string[], toggle = false) {
  const next = new URLSearchParams(params.toString());
  next.delete("novo");
  if (f.value === undefined) gParams.forEach((p) => next.delete(p));
  else if (toggle && params.get(f.param!) === f.value) next.delete(f.param!);
  else next.set(f.param!, f.value);
  const qs = next.toString();
  return `${section.href}${qs ? `?${qs}` : ""}`;
}

function useWide() {
  const [wide, setWide] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1280px)");
    const update = () => setWide(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return wide;
}

// ── Conteúdo do painel contextual (desktop) e da folha (celular) ─────────
function PanelBody({ section, data, size, onNavigate }: { section: NavSection; data?: PanelData[string]; size: "panel" | "sheet"; onNavigate?: () => void }) {
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname();
  const [q, setQ] = useState(params.get("q") ?? "");
  useEffect(() => setQ(params.get("q") ?? ""), [params]);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const next = new URLSearchParams(params.toString());
    if (q.trim()) next.set("q", q.trim()); else next.delete("q");
    router.push(`${section.href}${next.toString() ? `?${next}` : ""}`);
    onNavigate?.();
  }

  const item = size === "sheet" ? "h-12 text-sm" : "h-10 text-[13px]";
  return (
    <div className="flex flex-col">
      {section.search && (
        <form onSubmit={submitSearch} className={cn("mb-2 flex items-center gap-2 rounded-[10px] bg-field px-2.5 text-ink-faint dark:bg-white/5", size === "sheet" ? "h-11" : "h-9")}>
          <Search className="h-3.5 w-3.5 shrink-0" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={section.search.placeholder} aria-label={section.search.placeholder}
            className="min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-ink-faint" />
        </form>
      )}

      {[
        ...(section.filters ? [{ title: section.filtersTitle, filters: section.filters, extra: false }] : []),
        ...(section.filterGroups ?? []).map((g) => ({ ...g, extra: true })),
      ].map((group, gi) => {
        const gp = groupParams(group.filters);
        return (
          <div key={gi} className={gi > 0 ? "pt-3" : undefined}>
            {group.title && <p className="px-2.5 pb-1.5 pt-1 text-[10px] font-bold uppercase tracking-[1.2px] text-ink-faint">{group.title}</p>}
            <div className="flex flex-col gap-0.5">
              {group.filters.map((f) => {
                const active = isFilterActive(f, params, gp);
                const count = f.countKey ? data?.counts?.[f.countKey] : undefined;
                return (
                  <Link key={f.label} href={filterHref(section, f, params, gp, group.extra)} onClick={onNavigate} aria-current={active ? "true" : undefined}
                    className={cn("flex items-center rounded-[10px] px-2.5 font-semibold transition-colors", item,
                      active ? "bg-brand-soft font-bold text-brand-dark dark:bg-brand/15 dark:text-brand" : "text-ink-2 hover:bg-background dark:text-foreground-muted")}>
                    {f.label}
                    {count !== undefined && <span className={cn("ml-auto text-[11px] font-semibold", active ? "text-brand-dark dark:text-brand" : "text-ink-faint")}>{count}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}

      {!section.filters && section.hint && <p className="px-1 text-xs leading-relaxed text-foreground-muted">{section.hint}</p>}

      {section.shortcuts && section.shortcuts.length > 0 && (
        <>
          <p className="px-2.5 pb-1.5 pt-4 text-[10px] font-bold uppercase tracking-[1.2px] text-ink-faint">Atalhos</p>
          <div className="flex flex-col gap-1.5">
            {section.shortcuts.map((s) => (
              <Link key={s.href} href={s.href} onClick={onNavigate}
                className="flex h-10 items-center gap-2 rounded-[10px] border border-line px-3 text-[13px] font-semibold text-foreground transition-colors hover:border-brand hover:bg-background dark:border-white/10">
                <Plus className="h-3.5 w-3.5 text-brand" /> {s.label}
              </Link>
            ))}
          </div>
        </>
      )}

      {data?.recents && data.recents.length > 0 && (
        <>
          <p className="px-2.5 pb-1.5 pt-4 text-[10px] font-bold uppercase tracking-[1.2px] text-ink-faint">Recentes</p>
          <div className="flex flex-col gap-1">
            {data.recents.map((r) => {
              const here = pathname === r.href;
              return (
                <Link key={r.href} href={r.href} onClick={onNavigate}
                  className={cn("flex items-center gap-2.5 rounded-xl border p-2", here ? "border-brand-border bg-brand-soft dark:border-brand/30 dark:bg-brand/10" : "border-transparent hover:bg-background")}>
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-navy text-[10px] font-extrabold text-brand">{r.mark}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-[12.5px] font-bold text-foreground">{r.title}</span>
                    <span className={cn("block truncate text-[11px]", here ? "text-brand-dark dark:text-brand" : "text-foreground-muted")}>{r.subtitle}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </>
      )}

      {section.action && size === "panel" && (
        <Link href={section.action.href} onClick={onNavigate}
          className="mt-2 grid h-10 place-items-center rounded-xl border border-dashed border-line-strong text-xs font-semibold text-ink-faint transition-colors hover:border-brand hover:text-brand dark:border-white/15">
          + {section.action.label}
        </Link>
      )}
    </div>
  );
}

export function NavShell({ area, user, pendingOrders = 0, panelData = {}, children }: NavShellProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const wide = useWide();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [unread, setUnread] = useState(0);
  const sections = ADMIN_SECTIONS;
  const bottomIds = ADMIN_BOTTOM;
  const current = activeSection(sections, pathname) ?? sections[0];
  const data = panelData[current.id];

  // Painel aberto/recolhido (persistido). Em 1024–1279px abre por cima do conteúdo.
  const [panelOpen, setPanelOpen] = useState(true);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [ctxSheet, setCtxSheet] = useState(false);
  const [moreSheet, setMoreSheet] = useState(false);
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setMounted(true);
    try { setPanelOpen(localStorage.getItem("navPanel") !== "closed"); } catch { /* sem storage */ }
    fetch("/api/notifications/count").then((r) => r.json()).then((d) => setUnread(d.unread ?? 0)).catch(() => {});
  }, []);

  useEffect(() => { setOverlayOpen(false); setCtxSheet(false); setMoreSheet(false); }, [pathname]);

  // Overlay (1024–1279): fecha ao clicar fora.
  useEffect(() => {
    if (!overlayOpen) return;
    const onDown = (e: MouseEvent) => { if (panelRef.current && !panelRef.current.contains(e.target as Node) && !(e.target as HTMLElement).closest("[data-rail]")) setOverlayOpen(false); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [overlayOpen]);

  function setPanel(open: boolean) {
    setPanelOpen(open);
    try { localStorage.setItem("navPanel", open ? "open" : "closed"); } catch { /* sem storage */ }
  }

  const showPanel = wide ? panelOpen : overlayOpen;
  const dark = mounted && theme === "dark";
  const isDetail = DETAIL_ROUTES.some((r) => r.test(pathname));
  const groups = Array.from(new Set(sections.map((s) => s.group)));

  // Navegação do trilho por teclado (↑/↓).
  function railKeys(e: React.KeyboardEvent<HTMLElement>) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>("[data-rail-item]"));
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (i === -1) return;
    e.preventDefault();
    items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
  }

  const accountMenu = [
    { label: "Meu perfil", icon: <UserCircle className="h-3.5 w-3.5" />, onClick: () => router.push(PROFILE_PATH[area]) },
    { separator: true as const },
    { label: "Sair", icon: <LogOut className="h-3.5 w-3.5" />, variant: "destructive" as const, onClick: () => signOut({ callbackUrl: "/login" }) },
  ];
  const initial = user.name.trim()[0]?.toUpperCase() ?? "L";

  return (
    <div className="min-h-screen bg-background">
      {/* ── Trilho (desktop): passa o mouse e ele abre por cima do conteúdo mostrando os nomes ── */}
      <nav aria-label="Principal" data-rail onKeyDown={railKeys}
        className="group/rail fixed inset-y-0 left-0 z-40 hidden w-16 flex-col gap-1.5 overflow-hidden bg-navy px-2.5 py-4 transition-[width,box-shadow] duration-200 ease-out hover:w-56 hover:shadow-[8px_0_32px_rgba(15,22,32,.35)] hover:delay-150 has-[:focus-visible]:w-56 motion-reduce:transition-none lg:flex">
        <Link href={sections[0].href} className="mb-3.5 flex items-center gap-3 rounded-xl text-white" aria-label="Início">
          <span className="ml-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand text-[11px] font-extrabold">LEX</span>
          <span className="whitespace-nowrap text-[14px] font-extrabold opacity-0 transition-opacity duration-150 group-hover/rail:opacity-100 group-hover/rail:delay-100 group-has-[:focus-visible]/rail:opacity-100 motion-reduce:transition-none">Lex Concursos</span>
        </Link>
        {sections.map((s, i) => {
          const active = s.id === current.id;
          const Icon = s.icon;
          const dividerBefore = i > 0 && s.group !== sections[i - 1].group && (s.group === "Sistema" || s.group === "Alunos");
          return (
            <div key={s.id} className="contents">
              {dividerBefore && <span className="mx-2 my-2 h-px bg-white/10" aria-hidden />}
              <Link href={s.href} data-rail-item aria-label={s.label} aria-current={active ? "page" : undefined}
                onClick={() => { if (wide) setPanel(true); else setOverlayOpen(true); }}
                className={cn("relative flex h-11 w-full shrink-0 items-center rounded-xl outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-navy",
                  active ? "bg-brand text-white" : "text-white/60 hover:bg-white/10 hover:text-white")}>
                {active && <span className="absolute -left-2.5 top-2.5 h-6 w-[3px] rounded-r bg-white" aria-hidden />}
                <span className="relative grid h-11 w-11 shrink-0 place-items-center">
                  <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
                  {s.id === "orders" && pendingOrders > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-brand ring-2 ring-navy" aria-label={`${pendingOrders} pedidos pendentes`} />}
                </span>
                <span className="whitespace-nowrap text-[13.5px] font-semibold opacity-0 transition-opacity duration-150 group-hover/rail:opacity-100 group-hover/rail:delay-100 group-has-[:focus-visible]/rail:opacity-100 motion-reduce:transition-none">{s.label}</span>
                {s.id === "orders" && pendingOrders > 0 && <span className="ml-auto mr-3 rounded-full bg-brand px-1.5 text-[10.5px] font-bold text-white opacity-0 transition-opacity group-hover/rail:opacity-100 group-has-[:focus-visible]/rail:opacity-100">{pendingOrders}</span>}
              </Link>
            </div>
          );
        })}
        <div className="flex-1" />
        {!showPanel && (
          <button type="button" onClick={() => (wide ? setPanel(true) : setOverlayOpen(true))} aria-label="Abrir painel"
            className="flex h-11 w-full shrink-0 items-center rounded-xl text-white/60 hover:bg-white/10 hover:text-white">
            <span className="grid h-11 w-11 shrink-0 place-items-center"><ChevronRight className="h-[18px] w-[18px]" /></span>
            <span className="whitespace-nowrap text-[13.5px] font-semibold opacity-0 transition-opacity duration-150 group-hover/rail:opacity-100 group-hover/rail:delay-100 group-has-[:focus-visible]/rail:opacity-100 motion-reduce:transition-none">Abrir painel</span>
          </button>
        )}
        <button type="button" onClick={() => setTheme(dark ? "light" : "dark")} aria-label="Alternar tema"
          className="flex h-11 w-full shrink-0 items-center rounded-xl text-white/60 hover:bg-white/10 hover:text-white">
          <span className="grid h-11 w-11 shrink-0 place-items-center">{dark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}</span>
          <span className="whitespace-nowrap text-[13.5px] font-semibold opacity-0 transition-opacity duration-150 group-hover/rail:opacity-100 group-hover/rail:delay-100 group-has-[:focus-visible]/rail:opacity-100 motion-reduce:transition-none">{dark ? "Tema claro" : "Tema escuro"}</span>
        </button>
        <Dropdown align="left" className="mt-1.5" items={accountMenu}
          trigger={<span role="button" aria-label="Conta" className="flex cursor-pointer items-center text-white">
            <span className="grid h-11 w-11 shrink-0 place-items-center"><span className="grid h-[34px] w-[34px] place-items-center rounded-full bg-brand text-xs font-extrabold">{initial}</span></span>
            <span className="whitespace-nowrap text-[13.5px] font-semibold opacity-0 transition-opacity duration-150 group-hover/rail:opacity-100 group-hover/rail:delay-100 group-has-[:focus-visible]/rail:opacity-100 motion-reduce:transition-none">{user.name.split(" ")[0]}</span>
          </span>} />
      </nav>

      {/* ── Painel contextual (desktop) ── */}
      <aside ref={panelRef} aria-label={`Painel: ${current.label}`}
        className={cn("fixed inset-y-0 left-16 z-30 hidden w-[252px] flex-col border-r border-border bg-card transition-transform duration-200 ease-out lg:flex dark:bg-navy-panel",
          showPanel ? "translate-x-0" : "-translate-x-[calc(100%+64px)]", !wide && overlayOpen && "shadow-2xl")}>
        <div className="border-b border-line-soft px-4 pb-3 pt-5 dark:border-white/10">
          <p className="text-[10px] font-bold uppercase tracking-[1.2px] text-ink-faint">{current.group}</p>
          <p className="mt-0.5 text-lg font-extrabold text-foreground">{current.label}</p>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <PanelBody section={current} data={data} size="panel" onNavigate={() => !wide && setOverlayOpen(false)} />
        </div>
        {data?.footer && (
          <div className="mx-3 mb-3 rounded-xl border border-line-soft bg-background px-3 py-2.5 dark:border-white/10">
            <p className="text-[10px] font-bold uppercase tracking-[1.2px] text-ink-faint">{data.footer.label}</p>
            <p className="mt-0.5 text-xs font-semibold text-foreground">{data.footer.value}</p>
          </div>
        )}
        <button type="button" onClick={() => (wide ? setPanel(false) : setOverlayOpen(false))}
          className="flex items-center gap-1 border-t border-line-soft px-4 py-3 pb-[18px] text-left text-xs font-semibold text-ink-faint hover:text-foreground dark:border-white/10">
          <ChevronLeft className="h-3.5 w-3.5" /> Recolher painel
        </button>
      </aside>

      {/* ── Conteúdo ── */}
      <div className={cn("min-w-0 pb-28 transition-[padding] duration-200 lg:pb-0 lg:pl-16", wide && panelOpen && "xl:pl-[316px]")}>
        {/* Cabeçalho do celular (telas de detalhe têm o próprio) */}
        {!isDetail && (
          <header className="flex items-center gap-2.5 px-[18px] pt-3.5 lg:hidden">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-navy text-[10px] font-extrabold text-brand">LEX</span>
            <button type="button" onClick={() => setCtxSheet(true)} className="flex min-w-0 flex-1 items-center gap-1.5 text-left" aria-label={`${current.label}: busca e filtros`}>
              <span className="min-w-0">
                <span className="block text-[10px] font-bold uppercase tracking-[1.2px] text-ink-faint">{current.group}</span>
                <span className="block truncate text-lg font-extrabold leading-tight text-foreground">{current.label}</span>
              </span>
              <ChevronDown className="mt-3 h-4 w-4 shrink-0 text-ink-faint" />
            </button>
            {current.search && (
              <button type="button" onClick={() => setCtxSheet(true)} aria-label="Buscar" className="grid h-11 w-11 place-items-center rounded-lg border border-line-strong bg-card text-ink-2 dark:border-white/10 dark:text-foreground">
                <Search className="h-4 w-4" />
              </button>
            )}
            <span className="relative grid h-11 w-11 place-items-center rounded-lg border border-line-strong bg-card text-ink-2 dark:border-white/10 dark:text-foreground" aria-label={unread > 0 ? `${unread} notificações` : "Notificações"}>
              <Bell className="h-4 w-4" />
              {unread > 0 && <span className="absolute right-2 top-2 h-[7px] w-[7px] rounded-full bg-brand ring-2 ring-card" />}
            </span>
          </header>
        )}
        {/* Filtros como chips no celular */}
        {!isDetail && current.filters && (
          <div className="no-scrollbar flex gap-2 overflow-x-auto px-[18px] pt-3 lg:hidden">
            {current.filters.map((f) => {
              const gp = groupParams(current.filters!);
              const active = isFilterActive(f, searchParams, gp);
              const count = f.countKey ? data?.counts?.[f.countKey] : undefined;
              return (
                <Link key={f.label} href={filterHref(current, f, searchParams, gp)}
                  className={cn("inline-flex h-9 shrink-0 items-center rounded-full border px-3.5 text-xs font-semibold",
                    active ? "border-navy bg-navy text-white" : "border-line-strong bg-card text-ink-2 dark:border-white/10 dark:text-foreground-muted")}>
                  {f.label}{count !== undefined ? ` · ${count}` : ""}
                </Link>
              );
            })}
          </div>
        )}
        <main className="relative p-[18px] lg:px-7 lg:py-6">{children}</main>
      </div>

      {/* ── Barra inferior (celular/tablet) ── */}
      <nav aria-label="Principal" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 gap-1 bg-navy px-3 pb-[calc(10px+env(safe-area-inset-bottom))] pt-2.5 lg:hidden">
        {bottomIds.map((id) => {
          const s = sections.find((x) => x.id === id)!;
          const active = s.id === current.id && !moreSheet;
          const Icon = s.icon;
          return (
            <Link key={id} href={s.href} aria-current={active ? "page" : undefined}
              onClick={() => { if (active) window.scrollTo({ top: 0, behavior: "smooth" }); }}
              className={cn("relative flex h-[52px] flex-col items-center justify-center gap-1 text-[10px]", active ? "font-bold text-white" : "font-semibold text-white/60")}>
              {active && <span className="absolute inset-x-2 inset-y-1 rounded-xl bg-brand" aria-hidden />}
              <Icon className="relative h-5 w-5" strokeWidth={2} />
              <span className="relative">{s.shortLabel ?? s.label}</span>
              {s.id === "orders" && pendingOrders > 0 && (
                <span className="absolute right-[18px] top-1.5 rounded-full bg-white px-1.5 text-[9px] font-bold text-navy">{pendingOrders}</span>
              )}
            </Link>
          );
        })}
        <button type="button" onClick={() => setMoreSheet(true)} aria-label="Mais seções"
          className={cn("relative flex h-[52px] flex-col items-center justify-center gap-1 text-[10px]", moreSheet || !bottomIds.includes(current.id) ? "font-bold text-white" : "font-semibold text-white/60")}>
          {(moreSheet || !bottomIds.includes(current.id)) && <span className="absolute inset-x-2 inset-y-1 rounded-xl bg-brand" aria-hidden />}
          <Menu className="relative h-5 w-5" />
          <span className="relative">Mais</span>
        </button>
      </nav>

      {/* ── Folha contextual (toque no título) ── */}
      <BottomSheet open={ctxSheet} onClose={() => setCtxSheet(false)} label={`${current.label}: busca e filtros`} className="max-h-[85vh] rounded-t-3xl">
        <div className="overflow-y-auto px-3.5 pb-[calc(28px+env(safe-area-inset-bottom))]">
          <div className="mb-3 flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[1.2px] text-ink-faint">{current.group}</p>
              <p className="text-lg font-extrabold text-foreground">{current.label}</p>
            </div>
            {current.action && (
              <Link href={current.action.href} onClick={() => setCtxSheet(false)} className="inline-flex h-10 items-center gap-1 rounded-lg bg-brand px-3.5 text-[13px] font-semibold text-white">
                <Plus className="h-4 w-4" /> {current.action.label}
              </Link>
            )}
          </div>
          <PanelBody section={current} data={data} size="sheet" onNavigate={() => setCtxSheet(false)} />
        </div>
      </BottomSheet>

      {/* ── Folha "Mais" ── */}
      <BottomSheet open={moreSheet} onClose={() => setMoreSheet(false)} label="Todas as seções" className="max-h-[85vh] rounded-t-3xl">
        <div className="overflow-y-auto px-3.5 pb-[calc(20px+env(safe-area-inset-bottom))]">
          <div className="mb-3 flex items-center gap-3 border-b border-line-soft pb-3 dark:border-white/10">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-navy text-sm font-extrabold text-brand">{initial}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-foreground">{user.name}</p>
              <p className="truncate text-xs text-foreground-muted">{user.roleLabel} · Lex Concursos</p>
            </div>
            <button type="button" onClick={() => setTheme(dark ? "light" : "dark")} aria-label="Alternar tema" className="grid h-11 w-11 place-items-center rounded-lg border border-line-strong text-ink-2 dark:border-white/10 dark:text-foreground">
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
          {groups.map((g) => (
            <div key={g} className="mb-3">
              <p className="px-1 pb-2 text-[10px] font-bold uppercase tracking-[1.2px] text-ink-faint">{g}</p>
              <div className="grid grid-cols-4 gap-2">
                {sections.filter((s) => s.group === g).map((s) => {
                  const active = s.id === current.id;
                  const Icon = s.icon;
                  return (
                    <Link key={s.id} href={s.href} onClick={() => setMoreSheet(false)}
                      className={cn("flex min-h-[82px] flex-col items-center justify-center gap-1.5 rounded-[14px] p-2 text-center text-[11px] font-semibold",
                        active ? "bg-brand-soft text-brand-dark dark:bg-brand/15 dark:text-brand" : "bg-background text-ink-2 dark:text-foreground-muted")}>
                      <span className={cn("grid h-9 w-9 place-items-center rounded-[10px] border", active ? "border-brand bg-brand text-white" : "border-line bg-card dark:border-white/10")}>
                        <Icon className="h-4 w-4" strokeWidth={2} />
                      </span>
                      {s.shortLabel ?? s.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
          <Link href={PROFILE_PATH[area]} onClick={() => setMoreSheet(false)} className="mb-2 flex h-12 items-center justify-center rounded-xl border border-line-strong text-sm font-semibold text-foreground dark:border-white/10">Meu perfil</Link>
          <button type="button" onClick={() => signOut({ callbackUrl: "/login" })} className="flex h-12 w-full items-center justify-center rounded-xl border border-line-strong text-sm font-semibold text-danger dark:border-white/10">Sair da conta</button>
        </div>
      </BottomSheet>
    </div>
  );
}
