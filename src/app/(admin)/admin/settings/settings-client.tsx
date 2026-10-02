"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { PageHeader, Pill } from "@/components/admin/page-kit";
import { savePlatformSettings } from "@/lib/actions/admin";
import { formatRelativeDate } from "@/lib/utils/cn";
import type { PlatformSettingsData } from "@/lib/settings";

const SECTIONS = {
  geral: { title: "Geral", subtitle: "Identidade da plataforma e contato" },
  aluno: { title: "Área do aluno", subtitle: "Pontos (XP), conquistas e sequência de estudos" },
  integracoes: { title: "Integrações", subtitle: "Ferramentas externas configuradas pelo painel" },
  empresa: { title: "Empresa", subtitle: "Dados legais usados nos Termos de Uso e na Política de Privacidade" },
  pagamentos: { title: "Pagamentos", subtitle: "Taxas e comissões usadas no Financeiro" },
  equipe: { title: "Equipe", subtitle: "Quem administra e ensina na plataforma" },
  seguranca: { title: "Segurança", subtitle: "Acessos da equipe e ações sensíveis recentes" },
} as const;
type Section = keyof typeof SECTIONS;

export interface StaffRow { id: string; name: string; email: string; avatar: string | null; role: string; status: string; lastLoginAt: string | null; twoFactorEnabled: boolean }
export interface SecurityEvent { id: string; action: string; at: string; ip: string | null; actor: string }

const ROLE_LABEL: Record<string, string> = { admin: "Admin", moderator: "Moderador", teacher: "Professor" };
const EVENT_LABEL: Record<string, string> = {
  "user.updated": "Usuário alterado", "user.created": "Usuário criado", "user.imported": "Usuários importados", "settings.updated": "Configurações salvas",
  "order.refunded": "Pedido reembolsado", "order.manual_release": "Acesso liberado manualmente", "order.cancelled": "Pedido cancelado",
  "payout.processed": "Repasses processados", "product.deleted": "Produto excluído",
};

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[14px] border border-border bg-card p-[18px]">
      <h2 className="mb-4 text-[15px] font-bold text-foreground">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

const pct = (v: string) => Math.min(100, Math.max(0, Number(v) || 0));

// Configurações (modelo 5j): seções no painel de navegação (?secao=), formulário em cards.
export function SettingsClient({ settings: initial, staff, events }: { settings: PlatformSettingsData; staff: StaffRow[]; events: SecurityEvent[] }) {
  const { success, error } = useToast();
  const router = useRouter();
  const params = useSearchParams();
  const section: Section = (Object.keys(SECTIONS) as Section[]).includes(params.get("secao") as Section) ? (params.get("secao") as Section) : "geral";
  const [settings, setSettings] = useState(initial);
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(settings) !== JSON.stringify(initial);

  async function save() {
    setSaving(true);
    const result = await savePlatformSettings(settings);
    setSaving(false);
    if (!result.success) { error("Erro ao salvar."); return; }
    success("Configurações salvas!");
    router.refresh();
  }

  const set = <K extends keyof PlatformSettingsData>(group: K, patch: Partial<PlatformSettingsData[K]>) =>
    setSettings((s) => ({ ...s, [group]: { ...s[group], ...patch } }));
  const g = settings.general, x = settings.gamification, i = settings.integrations, c = settings.company, fin = settings.finance;
  const readOnly = section === "equipe" || section === "seguranca";

  return (
    <div>
      <PageHeader
        title={SECTIONS[section].title}
        subtitle={SECTIONS[section].subtitle}
        actions={readOnly ? undefined : (
          <>
            <Button variant="outline" disabled={!dirty || saving} onClick={() => setSettings(initial)}>Descartar</Button>
            <Button onClick={save} loading={saving} disabled={!dirty}>Salvar alterações</Button>
          </>
        )}
      />

      {section === "geral" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Plataforma">
            <Input label="Nome" value={g.name} onChange={(e) => set("general", { name: e.target.value })} />
            <Input label="Slogan" value={g.tagline} onChange={(e) => set("general", { tagline: e.target.value })} />
          </Panel>
          <Panel title="Contato e moeda">
            <Input label="E-mail de suporte" type="email" value={g.supportEmail} onChange={(e) => set("general", { supportEmail: e.target.value })} />
            <Select label="Moeda padrão" options={[{ value: "BRL", label: "Real (BRL)" }, { value: "USD", label: "Dólar (USD)" }, { value: "EUR", label: "Euro (EUR)" }]} value={g.currency} onChange={(e) => set("general", { currency: e.target.value })} />
          </Panel>
        </div>
      )}

      {section === "aluno" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Gamificação">
            <Switch checked={x.xpEnabled} onChange={(v) => set("gamification", { xpEnabled: v })} label="Pontos (XP)" description="O aluno ganha XP ao concluir aulas" />
            <Switch checked={x.achievementsEnabled} onChange={(v) => set("gamification", { achievementsEnabled: v })} label="Conquistas" description="Selos por marcos de estudo" />
            <Switch checked={x.streakEnabled} onChange={(v) => set("gamification", { streakEnabled: v })} label="Sequência de dias" description="Contador de dias seguidos estudando" />
            <Switch checked={x.rankingEnabled} onChange={(v) => set("gamification", { rankingEnabled: v })} label="Ranking" description="Classificação entre alunos" />
          </Panel>
          <Panel title="Valores de XP">
            <Input label="XP por aula concluída" type="number" min="0" value={String(x.xpPerLesson)} onChange={(e) => set("gamification", { xpPerLesson: Number(e.target.value) || 0 })} />
            <Input label="XP por curso concluído" type="number" min="0" value={String(x.xpPerCourse)} onChange={(e) => set("gamification", { xpPerCourse: Number(e.target.value) || 0 })} />
          </Panel>
        </div>
      )}

      {section === "integracoes" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Medição">
            <Input label="Google Analytics ID" placeholder="G-XXXXXXXXXX" value={i.googleAnalyticsId} onChange={(e) => set("integrations", { googleAnalyticsId: e.target.value })} />
            <Input label="Meta Pixel ID" placeholder="123456789" value={i.metaPixelId} onChange={(e) => set("integrations", { metaPixelId: e.target.value })} />
          </Panel>
          <Panel title="Suporte">
            <Input label="WhatsApp" placeholder="+55 85 99999-9999" value={i.whatsappNumber} onChange={(e) => set("integrations", { whatsappNumber: e.target.value })} />
          </Panel>
        </div>
      )}

      {section === "empresa" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Dados legais">
            <Input label="Razão social" value={c.legalName} onChange={(e) => set("company", { legalName: e.target.value })} />
            <Input label="CNPJ" placeholder="00.000.000/0000-00" value={c.cnpj} onChange={(e) => set("company", { cnpj: e.target.value })} />
            <Input label="Endereço" value={c.address} onChange={(e) => set("company", { address: e.target.value })} />
            <Input label="Cidade/UF (foro)" value={c.city} onChange={(e) => set("company", { city: e.target.value })} />
          </Panel>
          <Panel title="Contato e LGPD">
            <Input label="E-mail de contato (reembolsos e dúvidas)" type="email" value={c.contactEmail} onChange={(e) => set("company", { contactEmail: e.target.value })} />
            <Input label="Encarregado de dados (DPO)" value={c.dpoName} onChange={(e) => set("company", { dpoName: e.target.value })} />
            <Input label="E-mail do DPO" type="email" value={c.dpoEmail} onChange={(e) => set("company", { dpoEmail: e.target.value })} />
            <p className="text-xs text-foreground-muted">
              Esses dados substituem os marcadores em <Link href="/termos" target="_blank" className="text-brand underline">Termos</Link> e{" "}
              <Link href="/privacidade" target="_blank" className="text-brand underline">Privacidade</Link>. O texto jurídico ainda precisa de revisão.
            </p>
          </Panel>
        </div>
      )}

      {section === "pagamentos" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Taxas e comissões">
            <Input label="Taxa média do gateway (%)" type="number" min="0" max="100" step="0.01" value={String(fin.gatewayFeePercent)} onChange={(e) => set("finance", { gatewayFeePercent: pct(e.target.value) })} />
            <Input label="Comissão dos professores (%)" type="number" min="0" max="100" step="0.5" value={String(fin.teacherCommissionPercent)} onChange={(e) => set("finance", { teacherCommissionPercent: pct(e.target.value) })} />
            <p className="text-xs text-foreground-muted">
              Usadas para estimar taxas e repasses em <Link href="/admin/financial" className="text-brand underline">Financeiro</Link>. Repasses já processados não mudam.
            </p>
          </Panel>
          <Panel title="Gateway">
            <p className="text-sm text-foreground-muted">Pix, boleto e cartão pelo Mercado Pago. As credenciais ficam nas variáveis de ambiente da Vercel.</p>
            <Link href="/admin/integrations?categoria=pagamentos" className="text-sm font-semibold text-brand">Ver status e testar conexão →</Link>
          </Panel>
        </div>
      )}

      {section === "equipe" && (
        <div className="overflow-hidden rounded-[14px] border border-border bg-card">
          <div className="flex items-center justify-between border-b border-line-soft px-[18px] py-3 dark:border-white/10">
            <p className="text-sm font-bold text-foreground">{staff.length} pessoa{staff.length !== 1 ? "s" : ""}</p>
            <Link href="/admin/users" className="text-[13px] font-semibold text-brand">Gerenciar em Usuários →</Link>
          </div>
          <ul className="divide-y divide-line-soft dark:divide-white/10">
            {staff.map((u) => (
              <li key={u.id} className="flex items-center gap-3 px-[18px] py-3">
                <Avatar src={u.avatar ?? undefined} name={u.name} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-semibold text-foreground">{u.name}</span>
                  <span className="block truncate text-[11.5px] text-foreground-muted">{u.email} · {u.lastLoginAt ? `entrou ${formatRelativeDate(u.lastLoginAt)}` : "nunca entrou"}</span>
                </span>
                {u.status !== "active" && <Pill tone="danger">Inativo</Pill>}
                <Pill tone={u.role === "admin" ? "brand" : "gray"}>{ROLE_LABEL[u.role] ?? u.role}</Pill>
              </li>
            ))}
            {staff.length === 0 && <li className="py-10 text-center text-sm text-foreground-muted">Ninguém na equipe ainda.</li>}
          </ul>
        </div>
      )}

      {section === "seguranca" && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section className="overflow-hidden rounded-[14px] border border-border bg-card">
            <div className="flex items-center justify-between border-b border-line-soft px-[18px] py-3 dark:border-white/10">
              <h2 className="text-[15px] font-bold text-foreground">Ações sensíveis recentes</h2>
              <Link href="/admin/logs" className="text-[13px] font-semibold text-brand">Todos os logs →</Link>
            </div>
            <ul className="divide-y divide-line-soft dark:divide-white/10">
              {events.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 px-[18px] py-2.5 text-[13px]">
                  <span className="min-w-0 truncate text-foreground">
                    {EVENT_LABEL[e.action] ?? e.action} <span className="text-foreground-muted">· {e.actor}{e.ip ? ` · IP ${e.ip}` : ""}</span>
                  </span>
                  <span className="shrink-0 text-[11.5px] text-foreground-muted">{formatRelativeDate(e.at)}</span>
                </li>
              ))}
              {events.length === 0 && <li className="py-10 text-center text-sm text-foreground-muted">Nenhuma ação sensível registrada.</li>}
            </ul>
          </section>
          <Panel title="Proteções ativas">
            <ul className="space-y-2 text-[13px] text-foreground">
              <li>✓ Senhas com hash (bcrypt)</li>
              <li>✓ Limite de tentativas no login e no cadastro</li>
              <li>✓ Vídeos com link assinado e expiração</li>
              <li>✓ Ações do admin registradas em Logs</li>
            </ul>
            <p className="text-xs text-foreground-muted">
              {staff.some((u) => u.role === "admin" && !u.lastLoginAt)
                ? "Há admins que nunca entraram — revise em Equipe."
                : "Todos os admins já acessaram a plataforma."}
            </p>
          </Panel>
        </div>
      )}
    </div>
  );
}
