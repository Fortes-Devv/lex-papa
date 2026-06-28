"use client";
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";

export default function AdminSettingsPage() {
  const { success } = useToast();
  const [settings, setSettings] = useState({
    platformName: "LEX Concursos",
    tagline: "Aprenda sem limites",
    supportEmail: "suporte@lexconcursos.com",
    allowRegistration: true,
    require2FA: false,
    requireEmailVerification: true,
    pixEnabled: true,
    boletoEnabled: true,
    creditCardEnabled: true,
    testMode: true,
    googleOAuth: true,
    githubOAuth: true,
    primaryColor: "#5E6AD2",
    googleAnalyticsId: "G-XXXXXXXXXX",
    metaPixelId: "",
    gtmId: "",
    whatsappNumber: "+55 11 99999-9999",
  });

  const toggle = (key: keyof typeof settings) =>
    setSettings((s) => ({ ...s, [key]: !s[key as keyof typeof settings] }));

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Configurações</h1>
        <p className="text-sm text-foreground-muted mt-0.5">Gerencie todas as configurações da plataforma</p>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          {["general","auth","payment","appearance","integrations","email","security"].map((t) => (
            <TabsTrigger key={t} value={t}>
              {{ general: "Geral", auth: "Autenticação", payment: "Pagamento", appearance: "Visual", integrations: "Integrações", email: "Email", security: "Segurança" }[t]}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="general" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle>Informações da plataforma</CardTitle><CardDescription>Nome, descrição e dados de contato.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <Input label="Nome da plataforma" value={settings.platformName} onChange={(e) => setSettings((s) => ({ ...s, platformName: e.target.value }))} />
              <Input label="Tagline" value={settings.tagline} onChange={(e) => setSettings((s) => ({ ...s, tagline: e.target.value }))} />
              <Input label="Email de suporte" type="email" value={settings.supportEmail} onChange={(e) => setSettings((s) => ({ ...s, supportEmail: e.target.value }))} />
              <Select label="Idioma padrão" options={[{ value: "pt-BR", label: "Português (Brasil)" }, { value: "en-US", label: "English (US)" }, { value: "es-ES", label: "Español" }]} defaultValue="pt-BR" />
              <Select label="Moeda padrão" options={[{ value: "BRL", label: "Real (BRL)" }, { value: "USD", label: "Dólar (USD)" }, { value: "EUR", label: "Euro (EUR)" }]} defaultValue="BRL" />
            </CardContent>
            <CardFooter><Button onClick={() => success("Configurações salvas!")}>Salvar alterações</Button></CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="auth" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle>Autenticação & Acesso</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <Switch checked={settings.allowRegistration} onChange={() => toggle("allowRegistration")} label="Permitir novos cadastros" description="Usuários podem criar contas pela página de registro." />
              <Switch checked={settings.requireEmailVerification} onChange={() => toggle("requireEmailVerification")} label="Verificação de email obrigatória" description="Usuários devem confirmar o email antes de acessar." />
              <Switch checked={settings.require2FA} onChange={() => toggle("require2FA")} label="2FA obrigatório para admins" description="Administradores devem ativar autenticação em dois fatores." />
              <div className="pt-2 border-t border-border space-y-3">
                <p className="text-sm font-medium text-foreground">Login social</p>
                <Switch checked={settings.googleOAuth} onChange={() => toggle("googleOAuth")} label="Google" />
                <Switch checked={settings.githubOAuth} onChange={() => toggle("githubOAuth")} label="GitHub" />
              </div>
            </CardContent>
            <CardFooter><Button onClick={() => success("Configurações salvas!")}>Salvar</Button></CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="payment" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle>Gateway de Pagamento</CardTitle><CardDescription>Configure as formas de pagamento aceitas.</CardDescription></CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">Modo de teste</span>
                  <Badge variant="warning">Ativo</Badge>
                </div>
                <Switch checked={settings.testMode} onChange={() => toggle("testMode")} />
              </div>
              <div className="space-y-3 pt-2 border-t border-border">
                <Switch checked={settings.pixEnabled} onChange={() => toggle("pixEnabled")} label="PIX" description="Pagamento instantâneo via Banco Central." />
                <Switch checked={settings.boletoEnabled} onChange={() => toggle("boletoEnabled")} label="Boleto Bancário" description="Prazo de vencimento: 3 dias úteis." />
                <Switch checked={settings.creditCardEnabled} onChange={() => toggle("creditCardEnabled")} label="Cartão de Crédito/Débito" description="Visa, Mastercard, Elo e outros." />
              </div>
              <Input label="Chave API do Gateway" type="password" placeholder="sk_live_..." />
            </CardContent>
            <CardFooter><Button onClick={() => success("Gateway configurado!")}>Salvar</Button></CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle>Integrações</CardTitle><CardDescription>Configure pixels, analytics e ferramentas externas.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <Input label="Google Analytics ID" placeholder="G-XXXXXXXXXX" value={settings.googleAnalyticsId} onChange={(e) => setSettings((s) => ({ ...s, googleAnalyticsId: e.target.value }))} />
              <Input label="Meta Pixel ID" placeholder="123456789" value={settings.metaPixelId} onChange={(e) => setSettings((s) => ({ ...s, metaPixelId: e.target.value }))} />
              <Input label="Google Tag Manager ID" placeholder="GTM-XXXXXXX" value={settings.gtmId} onChange={(e) => setSettings((s) => ({ ...s, gtmId: e.target.value }))} />
              <Input label="WhatsApp (suporte)" placeholder="+55 11 99999-9999" value={settings.whatsappNumber} onChange={(e) => setSettings((s) => ({ ...s, whatsappNumber: e.target.value }))} />
            </CardContent>
            <CardFooter><Button onClick={() => success("Integrações salvas!")}>Salvar</Button></CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Segurança & Auditoria</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <Switch checked={true} onChange={() => {}} label="Rate limiting nas APIs" description="Limitar 100 req/min por IP." />
              <Switch checked={true} onChange={() => {}} label="Proteção CSRF" description="Token CSRF em todos os formulários." />
              <Switch checked={false} onChange={() => {}} label="Bloquear VPNs e proxies" description="Impede acesso de IPs suspeitos." />
              <Switch checked={true} onChange={() => {}} label="Logs de auditoria" description="Registrar todas as ações administrativas." />
              <div className="p-3 rounded-lg border border-warning/30 bg-warning-muted text-sm text-warning">
                Sessões expiram em 24h. Configure JWT_SECRET e NEXTAUTH_SECRET no ambiente.
              </div>
            </CardContent>
            <CardFooter><Button onClick={() => success("Configurações de segurança salvas!")}>Salvar</Button></CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
