"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Flame, Zap, ChevronRight, LogOut } from "lucide-react";
import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/toast";
import { MediaUploader } from "@/components/upload/media-uploader";
import { CdnImg } from "@/components/ui/cdn-img";
import { Bar } from "@/components/student/kit";
import { updateProfile, changePassword, updateAvatar, markAllNotificationsRead } from "@/lib/actions/profile";
import { setWeeklyGoal } from "@/lib/actions/learning";
import { formatCurrency, formatRelativeDate, cn } from "@/lib/utils/cn";

export type ProfileSection = "acessos" | "pagamentos" | "dados" | "preferencias" | "notificacoes" | "seguranca" | "conquistas";

interface ProfileUser { name: string; email: string; avatar?: string; bio: string; phone: string; location: string; createdAt: string; weeklyGoalMinutes: number }
interface Xp { level: number; currentLevelXp: number; nextLevelXp: number; totalXp: number }
interface Achievement { id: string; title: string; description: string; xpReward: number; badgeColor: string }
interface Access { id: string; title: string; thumbnail: string; slug: string; courseId: string | null; modules: number; progress: number; active: boolean; expiresAt: string | null; order: { id: string; createdAt: string; total: number; paymentMethod: string | null } | null }
interface OrderRow { id: string; title: string; productId: string | null; status: string; total: number; paymentMethod: string | null; createdAt: string }
interface NotificationRow { id: string; title: string; message: string; link: string | null; isRead: boolean; createdAt: string }

const MENU: { id: ProfileSection; label: string }[] = [
  { id: "acessos", label: "Meus acessos" },
  { id: "pagamentos", label: "Pagamentos" },
  { id: "dados", label: "Dados pessoais" },
  { id: "preferencias", label: "Preferências de estudo" },
  { id: "notificacoes", label: "Notificações" },
  { id: "seguranca", label: "Senha e segurança" },
  { id: "conquistas", label: "Conquistas e XP" },
];
const METHOD: Record<string, string> = { pix: "Pix", credit_card: "Cartão de crédito", debit_card: "Cartão de débito", boleto: "Boleto" };
const STATUS: Record<string, { label: string; cls: string }> = {
  paid: { label: "Pago", cls: "bg-ok-soft text-ok-text dark:bg-ok/15 dark:text-ok" },
  pending: { label: "Aguardando", cls: "bg-brand-soft text-brand-dark dark:bg-brand/15 dark:text-brand" },
  processing: { label: "Processando", cls: "bg-brand-soft text-brand-dark dark:bg-brand/15 dark:text-brand" },
  cancelled: { label: "Cancelado", cls: "bg-background text-foreground-muted" },
  failed: { label: "Recusado", cls: "bg-danger-soft text-danger dark:bg-danger/15" },
  refunded: { label: "Reembolsado", cls: "bg-background text-foreground-muted" },
};
const date = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Fortaleza" });
const shortId = (id: string) => `#${id.slice(-6).toUpperCase()}`;

function Card({ title, action, children }: { title?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-[14px] border border-border bg-card p-[18px]">
      {(title || action) && <div className="mb-4 flex items-center justify-between gap-3">{title && <h2 className="text-[15px] font-bold text-foreground">{title}</h2>}{action}</div>}
      {children}
    </section>
  );
}

export function ProfileClient({ section, user, streak, xp, achievements, accesses, orders, notifications }: {
  section: ProfileSection; user: ProfileUser; streak: number; xp: Xp; achievements: Achievement[]; accesses: Access[]; orders: OrderRow[]; notifications: NotificationRow[];
}) {
  const { success, error } = useToast();
  const router = useRouter();
  const [avatar, setAvatar] = useState(user.avatar);
  const [profile, setProfile] = useState({ name: user.name, bio: user.bio, phone: user.phone, location: user.location });
  const [pwd, setPwd] = useState({ current: "", next: "", confirm: "" });
  const [goalHours, setGoalHours] = useState(String(Math.round((user.weeklyGoalMinutes / 60) * 10) / 10));
  const [busy, setBusy] = useState<string | null>(null);
  const unread = notifications.filter((n) => !n.isRead).length;
  const since = new Date(user.createdAt).toLocaleDateString("pt-BR", { month: "short", year: "2-digit", timeZone: "America/Fortaleza" }).replace(" de ", "/");

  async function run(key: string, fn: () => Promise<{ success: boolean; error?: string }>, ok: string) {
    setBusy(key);
    const result = await fn();
    setBusy(null);
    if (!result.success) { error(result.error ?? "Não foi possível salvar."); return false; }
    success(ok);
    router.refresh();
    return true;
  }
  async function handleAvatar(url: string) {
    setAvatar(url);
    await updateAvatar(url);
    success("Foto atualizada!");
    router.refresh();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
      {/* Cartão do aluno + menu */}
      <aside className="space-y-3">
        <div className="rounded-[14px] border border-border bg-card p-[18px] text-center">
          <div className="mx-auto w-fit"><Avatar src={avatar} name={user.name} size="xl" /></div>
          <p className="mt-3 text-[16px] font-extrabold text-foreground">{user.name}</p>
          <p className="truncate text-xs text-foreground-muted">{user.email}</p>
          <div className="mt-3 flex flex-wrap justify-center gap-2 text-[11px] font-bold">
            {streak > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-1 text-brand-dark dark:bg-brand/15 dark:text-brand"><Flame className="h-3.5 w-3.5" /> {streak} dias seguidos</span>}
            <span className="rounded-full bg-background px-2.5 py-1 text-foreground-muted">Aluno desde {since}</span>
          </div>
        </div>
        <nav className="overflow-hidden rounded-[14px] border border-border bg-card" aria-label="Perfil">
          {MENU.map((m) => (
            <Link key={m.id} href={`/student/profile?secao=${m.id}`} scroll={false} aria-current={section === m.id ? "page" : undefined}
              className={cn("flex items-center justify-between border-b border-line-soft px-[18px] py-3 text-sm last:border-0 dark:border-white/10",
                section === m.id ? "bg-brand-soft font-bold text-foreground dark:bg-brand/10" : "font-medium text-foreground-muted hover:text-foreground")}>
              {m.label}
              <span className="flex items-center gap-2">
                {m.id === "notificacoes" && unread > 0 && <span className="rounded-full bg-brand px-1.5 text-[10px] font-bold text-white">{unread}</span>}
                <ChevronRight className="h-4 w-4 lg:hidden" />
              </span>
            </Link>
          ))}
          <button type="button" onClick={() => signOut({ callbackUrl: "/login" })} className="flex w-full items-center gap-2 px-[18px] py-3 text-sm font-semibold text-danger">
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </nav>
      </aside>

      <div className="min-w-0 space-y-4">
        {section === "acessos" && (
          <Card title="Meus acessos" action={<Link href="/student/explore" className="text-[13px] font-semibold text-brand">Ver todos os cursos →</Link>}>
            {accesses.length === 0 ? (
              <p className="py-6 text-center text-sm text-foreground-muted">Você ainda não tem cursos. <Link href="/student/explore" className="font-semibold text-brand">Ver cursos</Link></p>
            ) : (
              <ul className="space-y-3">
                {accesses.map((a) => (
                  <li key={a.id} className="rounded-xl border border-border p-4">
                    <div className="flex items-start gap-3">
                      <CdnImg src={a.thumbnail} width={96} alt="" className="h-14 w-14 shrink-0 rounded-xl bg-navy object-cover" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[15px] font-bold text-foreground">{a.title}</p>
                          <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold", a.active ? "bg-ok-soft text-ok-text dark:bg-ok/15 dark:text-ok" : "bg-background text-foreground-muted")}>{a.active ? "Ativo" : "Expirado"}</span>
                        </div>
                        <p className="text-xs text-foreground-muted">
                          {a.modules} módulos · {a.progress}% concluído{a.expiresAt ? ` · acesso ${a.active ? "até" : "encerrado em"} ${date(a.expiresAt)}` : " · acesso vitalício"}
                        </p>
                        <Bar value={a.progress} tone={a.progress === 100 ? "ok" : "brand"} className="mt-2" />
                      </div>
                    </div>
                    {a.order && (
                      <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-line-soft pt-3 text-xs dark:border-white/10">
                        <div><dt className="font-bold uppercase tracking-wider text-foreground-muted">Pedido</dt><dd className="mt-0.5 text-foreground">{shortId(a.order.id)} · {date(a.order.createdAt)}</dd></div>
                        <div><dt className="font-bold uppercase tracking-wider text-foreground-muted">Pagamento</dt><dd className="mt-0.5 text-foreground">{formatCurrency(a.order.total)}{a.order.paymentMethod ? ` · ${METHOD[a.order.paymentMethod] ?? a.order.paymentMethod}` : ""}</dd></div>
                      </dl>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {a.active && a.courseId ? (
                        <Link href={`/student/course?courseId=${a.courseId}`} className="inline-flex h-9 items-center rounded-lg bg-brand px-3.5 text-[13px] font-bold text-white hover:bg-brand-dark">Continuar estudando</Link>
                      ) : (
                        <Link href={`/cursos/${a.slug}`} className="inline-flex h-9 items-center rounded-lg bg-brand px-3.5 text-[13px] font-bold text-white hover:bg-brand-dark">Renovar acesso</Link>
                      )}
                      {a.order && <Link href={`/student/orders/${a.order.id}`} className="inline-flex h-9 items-center rounded-lg border border-line-strong px-3.5 text-[13px] font-semibold text-foreground dark:border-white/10">Recibo</Link>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}

        {section === "pagamentos" && (
          <Card title="Pagamentos">
            {orders.length === 0 ? (
              <p className="py-6 text-center text-sm text-foreground-muted">Nenhum pedido ainda.</p>
            ) : (
              <ul className="divide-y divide-line-soft dark:divide-white/10">
                {orders.map((o) => (
                  <li key={o.id} className="flex items-center gap-3 py-3">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-foreground">{o.title}</span>
                      <span className="block text-xs text-foreground-muted">{shortId(o.id)} · {date(o.createdAt)}{o.paymentMethod ? ` · ${METHOD[o.paymentMethod] ?? o.paymentMethod}` : ""}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-sm font-bold text-foreground">{formatCurrency(o.total)}</span>
                      <span className={cn("mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10.5px] font-bold", STATUS[o.status]?.cls)}>{STATUS[o.status]?.label ?? o.status}</span>
                    </span>
                    {o.status === "paid" ? (
                      <Link href={`/student/orders/${o.id}`} className="shrink-0 text-xs font-semibold text-brand">Recibo</Link>
                    ) : (o.status === "pending" || o.status === "processing") && o.productId ? (
                      <Link href={`/checkout?productId=${o.productId}`} className="shrink-0 text-xs font-semibold text-brand">Pagar</Link>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}

        {section === "dados" && (
          <Card title="Dados pessoais">
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Foto de perfil</label>
                <MediaUploader resourceType="image" folder="lms/avatars" value={avatar} onUploaded={(r) => handleAvatar(r.url)} onRemove={() => handleAvatar("")} />
              </div>
              <Input label="Nome completo" value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} />
              <Input label="E-mail" value={user.email} disabled />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="WhatsApp / telefone" value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} />
                <Input label="Cidade" value={profile.location} onChange={(e) => setProfile((p) => ({ ...p, location: e.target.value }))} />
              </div>
              <Textarea label="Sobre você" placeholder="Para qual concurso você está estudando?" value={profile.bio} onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))} />
              <Button loading={busy === "profile"} onClick={() => run("profile", () => updateProfile(profile), "Dados atualizados!")}>Salvar alterações</Button>
            </div>
          </Card>
        )}

        {section === "preferencias" && (
          <Card title="Preferências de estudo">
            <div className="max-w-sm space-y-4">
              <Input label="Meta de estudo por semana (horas)" type="number" min="0.5" max="60" step="0.5" value={goalHours} onChange={(e) => setGoalHours(e.target.value)} />
              <p className="text-xs text-foreground-muted">Conta o tempo de vídeo assistido de segunda a domingo. Aparece no Início e em Progresso.</p>
              <Button loading={busy === "goal"} onClick={() => run("goal", () => setWeeklyGoal(Number(goalHours) * 60), "Meta atualizada!")}>Salvar meta</Button>
            </div>
          </Card>
        )}

        {section === "notificacoes" && (
          <Card title="Notificações" action={unread > 0 ? (
            <Button size="sm" variant="outline" loading={busy === "read"} onClick={() => run("read", markAllNotificationsRead, "Tudo marcado como lido.")}>Marcar como lidas</Button>
          ) : undefined}>
            {notifications.length === 0 ? (
              <p className="py-6 text-center text-sm text-foreground-muted">Sem notificações por enquanto.</p>
            ) : (
              <ul className="space-y-2">
                {notifications.map((n) => {
                  const body = (
                    <>
                      <p className="text-sm font-semibold text-foreground">{n.title}</p>
                      <p className="mt-0.5 text-xs text-foreground-muted">{n.message}</p>
                      <p className="mt-1 text-[11px] text-foreground-muted">{formatRelativeDate(n.createdAt)}</p>
                    </>
                  );
                  const cls = cn("block rounded-xl border p-3", n.isRead ? "border-border" : "border-brand-border bg-brand-soft/50 dark:border-brand/30 dark:bg-brand/10");
                  return <li key={n.id}>{n.link ? <Link href={n.link} className={cls}>{body}</Link> : <div className={cls}>{body}</div>}</li>;
                })}
              </ul>
            )}
          </Card>
        )}

        {section === "seguranca" && (
          <Card title="Alterar senha">
            <div className="max-w-sm space-y-4">
              <Input label="Senha atual" type="password" autoComplete="current-password" value={pwd.current} onChange={(e) => setPwd((p) => ({ ...p, current: e.target.value }))} />
              <Input label="Nova senha" type="password" autoComplete="new-password" value={pwd.next} onChange={(e) => setPwd((p) => ({ ...p, next: e.target.value }))} />
              <Input label="Confirmar nova senha" type="password" autoComplete="new-password" value={pwd.confirm} onChange={(e) => setPwd((p) => ({ ...p, confirm: e.target.value }))} />
              <Button loading={busy === "pwd"} onClick={async () => {
                if (pwd.next !== pwd.confirm) { error("As senhas não coincidem."); return; }
                if (await run("pwd", () => changePassword({ current: pwd.current, next: pwd.next }), "Senha alterada!")) setPwd({ current: "", next: "", confirm: "" });
              }}>Alterar senha</Button>
            </div>
          </Card>
        )}

        {section === "conquistas" && (
          <>
            <Card title="Nível">
              <div className="flex items-center gap-4">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand dark:bg-brand/15"><Zap className="h-6 w-6" /></span>
                <div className="flex-1">
                  <p className="text-sm font-bold text-foreground">Nível {xp.level} · {xp.totalXp} XP</p>
                  <Bar value={(xp.currentLevelXp / xp.nextLevelXp) * 100} className="mt-2" />
                  <p className="mt-1 text-xs text-foreground-muted">{xp.currentLevelXp} / {xp.nextLevelXp} XP para o próximo nível</p>
                </div>
              </div>
            </Card>
            <Card title="Conquistas">
              {achievements.length === 0 ? (
                <p className="py-4 text-center text-sm text-foreground-muted">Complete aulas e cursos para desbloquear conquistas.</p>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {achievements.map((a) => (
                    <div key={a.id} className="flex flex-col items-center gap-2 rounded-xl border border-border p-4 text-center">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full text-lg" style={{ background: a.badgeColor + "20", color: a.badgeColor }}>★</div>
                      <p className="text-xs font-semibold text-foreground">{a.title}</p>
                      <p className="text-[11px] text-foreground-muted">{a.description}</p>
                      <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[10.5px] font-bold text-brand-dark dark:bg-brand/15 dark:text-brand">+{a.xpReward} XP</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
