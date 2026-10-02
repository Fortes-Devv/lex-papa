"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { PageHeader } from "@/components/admin/page-kit";
import { savePlatformSettings } from "@/lib/actions/admin";
import type { PlatformSettingsData } from "@/lib/settings";

const SECTIONS = {
  geral: { title: "Geral", subtitle: "Identidade da plataforma e contato" },
  aluno: { title: "Área do aluno", subtitle: "Pontos (XP), conquistas e sequência de estudos" },
  integracoes: { title: "Integrações", subtitle: "Ferramentas externas configuradas pelo painel" },
} as const;
type Section = keyof typeof SECTIONS;

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[14px] border border-border bg-card p-[18px]">
      <h2 className="mb-4 text-[15px] font-bold text-foreground">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

// Configurações (modelo 5j): seções no painel de navegação (?secao=), formulário em cards.
export function SettingsClient({ settings: initial }: { settings: PlatformSettingsData }) {
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
  const g = settings.general, x = settings.gamification, i = settings.integrations;

  return (
    <div>
      <PageHeader
        title={SECTIONS[section].title}
        subtitle={SECTIONS[section].subtitle}
        actions={
          <>
            <Button variant="outline" disabled={!dirty || saving} onClick={() => setSettings(initial)}>Descartar</Button>
            <Button onClick={save} loading={saving} disabled={!dirty}>Salvar alterações</Button>
          </>
        }
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
    </div>
  );
}
