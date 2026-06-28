"use client";
import { useState } from "react";
import { Plus, ExternalLink, CheckCircle, XCircle, AlertCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { MOCK_WEBHOOKS } from "@/lib/mock/data";
import { formatRelativeDate } from "@/lib/utils/cn";

const integrations = [
  { id: "ga", name: "Google Analytics", description: "Rastreamento de visitas e eventos", logo: "🔵", connected: true, category: "Analytics" },
  { id: "meta", name: "Meta Pixel", description: "Conversões e remarketing no Facebook/Instagram", logo: "🟦", connected: false, category: "Marketing" },
  { id: "gtm", name: "Google Tag Manager", description: "Gerenciar todos os scripts com uma única tag", logo: "🟠", connected: true, category: "Analytics" },
  { id: "whatsapp", name: "WhatsApp", description: "Botão de suporte e notificações via WhatsApp", logo: "🟢", connected: true, category: "Comunicação" },
  { id: "discord", name: "Discord", description: "Notificações de vendas e novos alunos", logo: "🟣", connected: false, category: "Comunicação" },
  { id: "slack", name: "Slack", description: "Alertas operacionais no Slack", logo: "⚫", connected: false, category: "Comunicação" },
  { id: "n8n", name: "n8n", description: "Automações avançadas self-hosted", logo: "🔴", connected: false, category: "Automação" },
  { id: "zapier", name: "Zapier", description: "Conectar a +5.000 apps sem código", logo: "🟡", connected: false, category: "Automação" },
  { id: "make", name: "Make (Integromat)", description: "Fluxos visuais de automação", logo: "🟤", connected: false, category: "Automação" },
];

export default function AdminIntegrationsPage() {
  const { success } = useToast();
  const [webhookOpen, setWebhookOpen] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookEvents, setWebhookEvents] = useState<string[]>(["order.paid"]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Integrações</h1>
        <p className="text-sm text-foreground-muted mt-0.5">Conecte a plataforma a serviços externos</p>
      </div>

      <Tabs defaultValue="integrations">
        <TabsList>
          <TabsTrigger value="integrations">Integrações</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="api">API</TabsTrigger>
        </TabsList>

        <TabsContent value="integrations" className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {integrations.map((integration) => (
              <div key={integration.id} className="rounded-lg border border-border bg-card p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{integration.logo}</span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{integration.name}</p>
                      <Badge variant="secondary" className="text-2xs">{integration.category}</Badge>
                    </div>
                  </div>
                  {integration.connected ? (
                    <Badge variant="success"><CheckCircle className="h-3 w-3" />Ativo</Badge>
                  ) : (
                    <Badge variant="secondary">Inativo</Badge>
                  )}
                </div>
                <p className="text-xs text-foreground-muted">{integration.description}</p>
                <Button
                  variant={integration.connected ? "outline" : "default"}
                  size="sm"
                  className="w-full"
                  onClick={() => success(integration.connected ? `${integration.name} desconectado.` : `${integration.name} conectado!`)}
                >
                  {integration.connected ? "Configurar" : "Conectar"}
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="webhooks" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button leftIcon={<Plus className="h-4 w-4" />} size="sm" onClick={() => setWebhookOpen(true)}>Novo Webhook</Button>
          </div>
          <div className="space-y-3">
            {MOCK_WEBHOOKS.map((wh) => (
              <div key={wh.id} className="rounded-lg border border-border bg-card p-4 flex items-start gap-4">
                <div className="h-2 w-2 rounded-full mt-2 shrink-0 bg-success" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground font-mono truncate">{wh.url}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {wh.events.map((e) => <Badge key={e} variant="secondary" className="text-2xs font-mono">{e}</Badge>)}
                  </div>
                  <p className="text-xs text-foreground-muted mt-1">
                    {wh.successCount} OK · {wh.failCount} erros · último disparo {wh.lastTriggeredAt ? formatRelativeDate(wh.lastTriggeredAt) : "—"}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="xs" onClick={() => success("Teste enviado!")}>Testar</Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => success("Webhook removido.")}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </div>
              </div>
            ))}
          </div>

          <Dialog open={webhookOpen} onClose={() => setWebhookOpen(false)} title="Novo Webhook" description="Será enviado um POST com payload JSON para a URL informada.">
            <div className="space-y-4">
              <Input label="URL de destino" type="url" placeholder="https://seu-servidor.com/webhook" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} />
              <Select label="Evento" options={[
                { value: "order.paid", label: "Pedido pago" },
                { value: "enrollment.created", label: "Matrícula criada" },
                { value: "user.registered", label: "Novo cadastro" },
                { value: "course.completed", label: "Curso concluído" },
              ]} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setWebhookOpen(false)}>Cancelar</Button>
              <Button onClick={() => { success("Webhook criado!"); setWebhookOpen(false); }}>Criar Webhook</Button>
            </DialogFooter>
          </Dialog>
        </TabsContent>

        <TabsContent value="api" className="mt-4">
          <div className="space-y-4 max-w-2xl">
            <div className="rounded-lg border border-border bg-card p-5 space-y-4">
              <h2 className="text-sm font-semibold text-foreground">Chaves de API</h2>
              <div className="p-3 rounded-lg bg-muted border border-border">
                <p className="text-xs text-foreground-muted mb-1">Chave pública</p>
                <p className="font-mono text-sm text-foreground">pk_live_edu_xxxxxxxxxxxxxxxxxx</p>
              </div>
              <div className="p-3 rounded-lg bg-muted border border-border">
                <p className="text-xs text-foreground-muted mb-1">Chave secreta</p>
                <p className="font-mono text-sm text-foreground">sk_live_••••••••••••••••••••••</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => success("Chave copiada!")}>Copiar chave pública</Button>
                <Button size="sm" variant="outline" onClick={() => success("Nova chave secreta gerada!")}>Regerar chave secreta</Button>
              </div>
            </div>
            <div className="rounded-lg border border-border bg-card p-5">
              <h2 className="text-sm font-semibold text-foreground mb-2">Documentação REST API</h2>
              <p className="text-sm text-foreground-muted mb-3">Base URL: <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs">https://api.lexconcursos.com/v1</code></p>
              <Button variant="outline" size="sm" leftIcon={<ExternalLink className="h-3.5 w-3.5" />}>Abrir documentação</Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
