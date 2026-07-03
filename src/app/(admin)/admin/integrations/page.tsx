export const dynamic = "force-dynamic";
import Link from "next/link";
import { CheckCircle, XCircle, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getSettings } from "@/lib/settings";
import { isMercadoPagoConfigured } from "@/lib/mercadopago";

export default async function AdminIntegrationsPage() {
  const settings = await getSettings();
  const cloudinaryOk = Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
  const mpOk = isMercadoPagoConfigured();

  const integrations = [
    { name: "Neon (Postgres)", description: "Banco de dados da plataforma", connected: true, category: "Infraestrutura", configHint: "Configurado via DATABASE_URL", href: null },
    { name: "Cloudinary", description: "Upload e streaming de vídeos e imagens", connected: cloudinaryOk, category: "Mídia", configHint: "Configure CLOUDINARY_* nas variáveis de ambiente", href: null },
    { name: "Mercado Pago", description: "Processamento de pagamentos (Checkout Bricks)", connected: mpOk, category: "Pagamento", configHint: "Configure MERCADOPAGO_* nas variáveis de ambiente", href: null },
    { name: "Google Analytics", description: "Rastreamento de visitas e eventos", connected: Boolean(settings.integrations.googleAnalyticsId), category: "Analytics", configHint: "Configure em Configurações → Integrações", href: "/admin/settings" },
    { name: "Meta Pixel", description: "Conversões e remarketing", connected: Boolean(settings.integrations.metaPixelId), category: "Marketing", configHint: "Configure em Configurações → Integrações", href: "/admin/settings" },
    { name: "WhatsApp", description: "Botão de suporte via WhatsApp", connected: Boolean(settings.integrations.whatsappNumber), category: "Comunicação", configHint: "Configure em Configurações → Integrações", href: "/admin/settings" },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Integrações</h1>
        <p className="text-sm text-foreground-muted mt-0.5">Serviços conectados à plataforma</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {integrations.map((integration) => (
          <div key={integration.name} className="rounded-lg border border-border bg-card p-4 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-foreground">{integration.name}</p>
                <Badge variant="secondary" className="text-2xs mt-1">{integration.category}</Badge>
              </div>
              {integration.connected ? (
                <Badge variant="success"><CheckCircle className="h-3 w-3" />Ativo</Badge>
              ) : (
                <Badge variant="secondary"><XCircle className="h-3 w-3" />Inativo</Badge>
              )}
            </div>
            <p className="text-xs text-foreground-muted flex-1">{integration.description}</p>
            <p className="text-2xs text-foreground-subtle">{integration.configHint}</p>
            {integration.href && (
              <Link href={integration.href}>
                <Button variant="outline" size="sm" className="w-full" rightIcon={<ExternalLink className="h-3.5 w-3.5" />}>Configurar</Button>
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
