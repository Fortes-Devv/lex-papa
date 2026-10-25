export const dynamic = "force-dynamic";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireArea } from "@/lib/auth-guards";
import { PageHeader, MetricCard, SectionCard, Pill, tableHeadClass } from "@/components/admin/page-kit";
import { MAX_STUDENT_SESSIONS } from "@/lib/security";
import { SECURITY_EVENT_LABEL, SEVERITY_LABEL } from "@/lib/security-labels";
import { codeFromSearch, viewerCode } from "@/lib/viewer-mark";
import { RevokeButton } from "./revoke-button";
import { cn } from "@/lib/utils/cn";

const DAY = 86_400_000;
const fmt = (d: Date) => d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Fortaleza" }).replace(",", "");

// Segurança: eventos gravados pelo servidor (logins, bloqueios, acessos negados),
// contas com sinal de senha compartilhada e os aparelhos conectados de cada conta.
// ?tipo=<evento>  ?q=e-mail, nome ou #CÓDIGO da marca-d'água
export default async function AdminSecurityPage(props: { searchParams: Promise<{ tipo?: string; q?: string }> }) {
  await requireArea("admin");
  const { tipo, q } = await props.searchParams;
  const since7 = new Date(Date.now() - 7 * DAY);
  const since30 = new Date(Date.now() - 30 * DAY);

  // Conta procurada (e-mail, nome ou código da marca-d'água).
  const term = q?.trim() ?? "";
  const code = codeFromSearch(term);
  const found = term
    ? await db.user.findMany({
        where: code
          ? { id: { endsWith: code.toLowerCase(), mode: "insensitive" } }
          : { OR: [{ email: { contains: term, mode: "insensitive" } }, { name: { contains: term, mode: "insensitive" } }] },
        select: { id: true, name: true, email: true, status: true, role: true },
        take: 5,
      })
    : [];

  const byType = await db.securityEvent.groupBy({ by: ["type"], where: { createdAt: { gte: since7 } }, _count: true });
  const count7 = (t: string) => byType.find((b) => b.type === t)?._count ?? 0;
  const activeSessions = await db.userSession.count({ where: { revokedAt: null, lastSeenAt: { gte: since30 } } });

  // Sinal de senha compartilhada: o limite de aparelhos derrubou alguém 3+ vezes em 30 dias.
  const sharing = await db.securityEvent.groupBy({
    by: ["userId"],
    where: { type: "session_limit", createdAt: { gte: since30 }, userId: { not: null } },
    _count: true,
    orderBy: { _count: { userId: "desc" } },
    having: { userId: { _count: { gte: 3 } } },
    take: 20,
  });
  const sharingUsers = sharing.length
    ? await db.user.findMany({ where: { id: { in: sharing.map((s) => s.userId!) } }, select: { id: true, name: true, email: true } })
    : [];

  const sessions = found.length
    ? await db.userSession.findMany({
        where: { userId: { in: found.map((u) => u.id) }, revokedAt: null, lastSeenAt: { gte: since30 } },
        orderBy: { lastSeenAt: "desc" },
        take: 30,
      })
    : [];

  const events = await db.securityEvent.findMany({
    where: {
      ...(tipo ? { type: tipo } : {}),
      ...(term ? { OR: [{ userId: { in: found.map((u) => u.id) } }, { email: { contains: term, mode: "insensitive" as const } }] } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const eventUsers = await db.user.findMany({
    where: { id: { in: [...new Set(events.map((e) => e.userId).filter(Boolean))] as string[] } },
    select: { id: true, name: true, email: true },
  });
  const userById = new Map(eventUsers.map((u) => [u.id, u]));
  const filterHref = (t?: string) => `/admin/security?${new URLSearchParams({ ...(t ? { tipo: t } : {}), ...(term ? { q: term } : {}) })}`;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Segurança"
        subtitle={`Logins, bloqueios e acessos negados. Cada aluno pode ficar conectado em até ${MAX_STUDENT_SESSIONS} aparelhos ao mesmo tempo.`}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Aparelhos conectados" value={activeSessions.toLocaleString("pt-BR")} hint="ativos nos últimos 30 dias" />
        <MetricCard label="Logins com erro (7 dias)" value={count7("login_fail") + count7("login_rate_limited")} hint={`${count7("login_rate_limited")} bloqueados por excesso`} />
        <MetricCard label="Acessos negados (7 dias)" value={count7("access_denied") + count7("login_blocked")} hint="vídeo/PDF sem matrícula ou conta suspensa" valueTone={count7("access_denied") > 20 ? "danger" : undefined} />
        <MetricCard label="Desconectados pelo limite (7 dias)" value={count7("session_limit")} hint="entraram num aparelho a mais" />
      </div>

      <form className="flex flex-wrap items-center gap-2" action="/admin/security">
        <input name="q" defaultValue={term} placeholder="E-mail, nome ou #CÓDIGO da marca-d'água"
          className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-brand sm:max-w-md" />
        {tipo && <input type="hidden" name="tipo" value={tipo} />}
        <button className="h-10 rounded-lg bg-navy px-4 text-sm font-semibold text-white">Buscar</button>
        {term && <Link href={filterHref(tipo)} className="text-sm font-semibold text-foreground-muted hover:text-foreground">Limpar</Link>}
      </form>

      {found.length > 0 && (
        <SectionCard title="Conta procurada">
          <ul className="divide-y divide-border">
            {found.map((u) => {
              const own = sessions.filter((s) => s.userId === u.id);
              return (
                <li key={u.id} className="px-[18px] py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-foreground">{u.name}</span>
                    <span className="text-sm text-foreground-muted">{u.email} · #{viewerCode(u.id)}</span>
                    {u.status !== "active" && <Pill tone="danger">{u.status === "banned" ? "Bloqueada" : "Inativa"}</Pill>}
                    <span className="flex-1" />
                    {own.length > 0 && <RevokeButton userId={u.id} label="Desconectar todos" />}
                  </div>
                  {own.length > 0 ? (
                    <ul className="mt-2 space-y-1.5">
                      {own.map((s) => (
                        <li key={s.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-background px-3 py-2 text-sm">
                          <span className="font-medium text-foreground">{s.device ?? "Aparelho"}</span>
                          <span className="text-foreground-muted">IP {s.ipPrefix ?? "—"} · entrou {fmt(s.createdAt)} · visto {fmt(s.lastSeenAt)}</span>
                          <span className="flex-1" />
                          <RevokeButton sessionId={s.id} label="Desconectar" />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-sm text-foreground-muted">Nenhum aparelho conectado.</p>
                  )}
                </li>
              );
            })}
          </ul>
        </SectionCard>
      )}

      {sharingUsers.length > 0 && (
        <SectionCard title="Possível senha compartilhada (30 dias)">
          <p className="px-[18px] pb-2 text-[13px] text-foreground-muted">Contas que entraram em mais aparelhos que o limite 3 vezes ou mais. Não é prova: pode ser a mesma pessoa trocando de aparelho.</p>
          <ul className="divide-y divide-border">
            {sharing.map((s) => {
              const u = sharingUsers.find((x) => x.id === s.userId);
              if (!u) return null;
              return (
                <li key={u.id} className="flex flex-wrap items-center gap-2 px-[18px] py-2.5 text-sm">
                  <Link href={`/admin/security?q=${encodeURIComponent(u.email)}`} className="font-semibold text-foreground hover:text-brand">{u.name}</Link>
                  <span className="text-foreground-muted">{u.email}</span>
                  <Pill tone="danger">{s._count} vezes</Pill>
                  <span className="flex-1" />
                  <RevokeButton userId={u.id} label="Desconectar todos" />
                </li>
              );
            })}
          </ul>
        </SectionCard>
      )}

      <SectionCard
        title="Eventos"
        action={
          <div className="flex flex-wrap gap-1.5">
            {[undefined, "access_denied", "login_fail", "login_rate_limited", "session_limit", "account_suspended"].map((t) => (
              <Link key={t ?? "all"} href={filterHref(t)}
                className={cn("rounded-full px-2.5 py-1 text-[11.5px] font-semibold", tipo === t || (!tipo && !t) ? "bg-navy text-white" : "bg-line-soft text-ink-2 dark:bg-white/10 dark:text-foreground-muted")}>
                {t ? SECURITY_EVENT_LABEL[t] : "Todos"}
              </Link>
            ))}
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                {["Quando", "Evento", "Gravidade", "Conta", "Detalhe", "Aparelho"].map((h) => <th key={h} className={cn(tableHeadClass, "px-[18px] py-2")}>{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {events.map((e) => {
                const u = e.userId ? userById.get(e.userId) : undefined;
                return (
                  <tr key={e.id} className="align-top">
                    <td className="whitespace-nowrap px-[18px] py-2.5 tabular-nums text-foreground-muted">{fmt(e.createdAt)}</td>
                    <td className="px-[18px] py-2.5 font-medium text-foreground">{SECURITY_EVENT_LABEL[e.type] ?? e.type}</td>
                    <td className="px-[18px] py-2.5"><Pill tone={e.severity === "high" ? "danger" : e.severity === "medium" ? "brand" : "gray"}>{SEVERITY_LABEL[e.severity] ?? e.severity}</Pill></td>
                    <td className="px-[18px] py-2.5">
                      {u ? <Link href={`/admin/security?q=${encodeURIComponent(u.email)}`} className="font-medium text-foreground hover:text-brand">{u.name}</Link>
                        : <span className="text-foreground-muted">{e.email ?? "—"}</span>}
                    </td>
                    <td className="px-[18px] py-2.5 text-foreground-muted">{[e.reason, e.resource].filter(Boolean).join(" · ") || "—"}</td>
                    <td className="whitespace-nowrap px-[18px] py-2.5 text-foreground-muted">{[e.device, e.ipPrefix].filter(Boolean).join(" · ") || "—"}</td>
                  </tr>
                );
              })}
              {events.length === 0 && <tr><td colSpan={6} className="px-[18px] py-10 text-center text-foreground-muted">Nenhum evento {tipo || term ? "com esse filtro" : "ainda"}.</td></tr>}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
