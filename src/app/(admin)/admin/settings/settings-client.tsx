"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { savePlatformSettings } from "@/lib/actions/admin";
import type { PlatformSettingsData } from "@/lib/settings";

export function SettingsClient({ settings: initial }: { settings: PlatformSettingsData }) {
  const { success, error } = useToast();
  const router = useRouter();
  const [settings, setSettings] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const result = await savePlatformSettings(settings);
    setSaving(false);
    if (!result.success) { error("Erro ao salvar."); return; }
    success("Configurações salvas!");
    router.refresh();
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Configurações</h1>
        <p className="text-sm text-foreground-muted mt-0.5">Gerencie as configurações da plataforma</p>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">Geral</TabsTrigger>
          <TabsTrigger value="integrations">Integrações</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle>Informações da plataforma</CardTitle><CardDescription>Nome, tagline e contato.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <Input label="Nome da plataforma" value={settings.general.name} onChange={(e) => setSettings((s) => ({ ...s, general: { ...s.general, name: e.target.value } }))} />
              <Input label="Tagline" value={settings.general.tagline} onChange={(e) => setSettings((s) => ({ ...s, general: { ...s.general, tagline: e.target.value } }))} />
              <Input label="Email de suporte" type="email" value={settings.general.supportEmail} onChange={(e) => setSettings((s) => ({ ...s, general: { ...s.general, supportEmail: e.target.value } }))} />
              <Select label="Moeda padrão" options={[{ value: "BRL", label: "Real (BRL)" }, { value: "USD", label: "Dólar (USD)" }, { value: "EUR", label: "Euro (EUR)" }]} value={settings.general.currency} onChange={(e) => setSettings((s) => ({ ...s, general: { ...s.general, currency: e.target.value } }))} />
            </CardContent>
            <CardFooter><Button onClick={save} loading={saving}>Salvar alterações</Button></CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle>Integrações</CardTitle><CardDescription>Analytics e ferramentas externas.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <Input label="Google Analytics ID" placeholder="G-XXXXXXXXXX" value={settings.integrations.googleAnalyticsId} onChange={(e) => setSettings((s) => ({ ...s, integrations: { ...s.integrations, googleAnalyticsId: e.target.value } }))} />
              <Input label="Meta Pixel ID" placeholder="123456789" value={settings.integrations.metaPixelId} onChange={(e) => setSettings((s) => ({ ...s, integrations: { ...s.integrations, metaPixelId: e.target.value } }))} />
              <Input label="WhatsApp (suporte)" placeholder="+55 11 99999-9999" value={settings.integrations.whatsappNumber} onChange={(e) => setSettings((s) => ({ ...s, integrations: { ...s.integrations, whatsappNumber: e.target.value } }))} />
            </CardContent>
            <CardFooter><Button onClick={save} loading={saving}>Salvar alterações</Button></CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
