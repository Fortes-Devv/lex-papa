"use client";
import { useEffect, useState, useMemo, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Download, RefreshCcw, ChevronDown, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, Pill, tableHeadClass } from "@/components/admin/page-kit";
import { useToast } from "@/components/ui/toast";
import { refundOrder } from "@/lib/actions/orders";
import { formatCurrency, formatDate, formatRelativeDate, cn } from "@/lib/utils/cn";

export interface OrderDTO {
  id: string;
  userName: string;
  userAvatar?: string;
  productTitle: string;
  paymentMethod: string | null;
  total: number;
  status: string;
  createdAt: string;
  paidAt: string | null;
  email: string;
  couponCode: string | null;
  discount: number;
  mpOrderId: string | null;
  mpStatusDetail: string | null;
}

const statusConfig: Record<string, { label: string; variant?: string }> = {
  paid:        { label: "Pago",        variant: "success" },
  pending:     { label: "Pendente",    variant: "warning" },
  processing:  { label: "Processando", variant: "info" },
  failed:      { label: "Falhou",      variant: "destructive" },
  refunded:    { label: "Reembolsado", variant: "destructive" },
  chargeback:  { label: "Chargeback",  variant: "destructive" },
  cancelled:   { label: "Cancelado",   variant: "secondary" },
};

const methodLabels: Record<string, string> = {
  credit_card: "Cartão de crédito", debit_card: "Cartão de débito",
  pix: "PIX", boleto: "Boleto", paypal: "PayPal",
};

function toCsv(orders: OrderDTO[]) {
  const header = ["ID", "Cliente", "Produto", "Método", "Total", "Status", "Data"];
  const rows = orders.map((o) => [
    o.id, o.userName, o.productTitle, o.paymentMethod ? methodLabels[o.paymentMethod] : "",
    o.total.toFixed(2), statusConfig[o.status]?.label ?? o.status, formatDate(o.createdAt),
  ]);
  return [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
}

export function OrdersClient({ orders }: { orders: OrderDTO[] }) {
  const { success, error } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [periodFilter, setPeriodFilter] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  // Filtros do painel de navegação (?status=pending|paid|cancelled|refunded, ?periodo=hoje|7d|30d, ?q=busca).
  const searchParams = useSearchParams();
  useEffect(() => {
    setStatusFilter(searchParams.get("status") ?? "");
    setSearch(searchParams.get("q") ?? "");
    setPeriodFilter(searchParams.get("periodo") ?? "");
  }, [searchParams]);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const q = search.toLowerCase();
      const matchSearch = !search || o.userName.toLowerCase().includes(q) || o.email.toLowerCase().includes(q) || o.id.toLowerCase().includes(q);
      // Agrupa como o painel: pendente inclui "em processamento"; cancelado inclui "falhou".
      const matchStatus = !statusFilter || o.status === statusFilter
        || (statusFilter === "pending" && o.status === "processing")
        || (statusFilter === "cancelled" && o.status === "failed")
        || (statusFilter === "refunded" && o.status === "chargeback");
      const days = periodFilter === "hoje" ? 1 : periodFilter === "7d" ? 7 : periodFilter === "30d" ? 30 : 0;
      const matchPeriod = !days || Date.now() - new Date(o.createdAt).getTime() < days * 86_400_000;
      return matchSearch && matchStatus && matchPeriod;
    });
  }, [orders, search, statusFilter, periodFilter]);

  const totalConfirmed = filtered.filter((o) => o.status === "paid").reduce((s, o) => s + o.total, 0);

  function handleExport() {
    const csv = toCsv(filtered);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pedidos-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleRefund(orderId: string) {
    const result = await refundOrder(orderId);
    if (!result.success) { error(result.error); return; }
    success("Pedido reembolsado.");
    startTransition(() => router.refresh());
  }

  const waiting = filtered.filter((o) => o.status === "pending" || o.status === "processing");
  const waitingTotal = waiting.reduce((s, o) => s + o.total, 0);
  const titleByStatus: Record<string, string> = { pending: "Pedidos pendentes", paid: "Pedidos pagos", cancelled: "Pedidos cancelados", refunded: "Pedidos reembolsados" };
  const subtitle = statusFilter === "pending"
    ? `${waiting.length} aguardando pagamento · ${formatCurrency(waitingTotal)}`
    : `${filtered.length} pedido${filtered.length !== 1 ? "s" : ""} · ${formatCurrency(totalConfirmed)} confirmado`;
  const tone = (status: string) => (status === "paid" ? "ok" : status === "pending" || status === "processing" ? "brand" : status === "cancelled" || status === "failed" ? "gray" : "danger") as "ok" | "brand" | "gray" | "danger";
  const shortId = (id: string) => `#${id.slice(-6).toUpperCase()}`;
  const ago = (iso: string) => formatRelativeDate(iso);

  function Details({ o }: { o: OrderDTO }) {
    return (
      <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
        <div><p className={tableHeadClass}>E-mail</p><p className="mt-0.5 text-[13px] text-foreground">{o.email}</p></div>
        <div><p className={tableHeadClass}>Cupom</p><p className="mt-0.5 text-[13px] text-foreground">{o.couponCode ? `${o.couponCode} (−${formatCurrency(o.discount)})` : "—"}</p></div>
        <div><p className={tableHeadClass}>{o.paidAt ? "Pago em" : "Criado em"}</p><p className="mt-0.5 text-[13px] text-foreground">{formatDate(o.paidAt ?? o.createdAt)}</p></div>
        {o.mpStatusDetail && <div><p className={tableHeadClass}>Mercado Pago</p><p className="mt-0.5 text-[13px] text-foreground">{o.mpStatusDetail}</p></div>}
        <div className="ml-auto flex flex-wrap gap-2">
          <button type="button" onClick={() => { navigator.clipboard.writeText(o.id); success("ID do pedido copiado."); }}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong bg-card px-3 text-[13px] font-semibold text-foreground hover:bg-background dark:border-white/10">
            <Copy className="h-3.5 w-3.5" /> Copiar ID
          </button>
          {o.status === "paid" && (
            <button type="button" disabled={isPending} onClick={() => { if (confirm(`Reembolsar o pedido ${shortId(o.id)} de ${o.userName}? O acesso ao curso é removido.`)) handleRefund(o.id); }}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong bg-card px-3 text-[13px] font-semibold text-danger hover:bg-background disabled:opacity-50 dark:border-white/10">
              <RefreshCcw className="h-3.5 w-3.5" /> Reembolsar
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={titleByStatus[statusFilter] ?? "Pedidos"}
        subtitle={subtitle}
        actions={<Button variant="outline" leftIcon={<Download className="h-4 w-4" />} onClick={handleExport}>Exportar</Button>}
      />

      {/* Desktop: tabela com linha expansível */}
      <div className="hidden overflow-hidden rounded-[14px] border border-border bg-card md:block">
        <div className={cn("grid grid-cols-[90px_minmax(150px,1.2fr)_minmax(160px,1.4fr)_110px_100px_110px_32px] gap-3 border-b border-line-soft bg-[#faf8f5] px-[18px] py-2.5 dark:border-white/10 dark:bg-white/5", tableHeadClass)}>
          <span>Pedido</span><span>Aluno</span><span>Produto</span><span>Valor</span><span>Pagamento</span><span>Status</span><span />
        </div>
        {filtered.map((o) => {
          const expanded = open === o.id;
          const cfg = statusConfig[o.status] ?? { label: o.status };
          return (
            <div key={o.id} className={cn("border-b border-line-soft last:border-0 dark:border-white/10", expanded && "bg-brand-soft/40 dark:bg-brand/5")}>
              <button type="button" onClick={() => setOpen(expanded ? null : o.id)} aria-expanded={expanded}
                className="grid w-full grid-cols-[90px_minmax(150px,1.2fr)_minmax(160px,1.4fr)_110px_100px_110px_32px] items-center gap-3 px-[18px] py-3 text-left hover:bg-background/60">
                <span className="text-[13px] font-bold text-foreground">{shortId(o.id)}</span>
                <span className="min-w-0">
                  <span className="block truncate text-[13.5px] font-medium text-foreground">{o.userName}</span>
                  <span className="block text-[11px] text-foreground-muted">{ago(o.createdAt)}</span>
                </span>
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className="h-[22px] w-[34px] shrink-0 rounded bg-navy" aria-hidden />
                  <span className="line-clamp-2 text-[12.5px] text-foreground">{o.productTitle}</span>
                </span>
                <span className="text-[13.5px] font-bold text-foreground">{formatCurrency(o.total)}</span>
                <span className="text-[12.5px] text-foreground-muted">{o.paymentMethod ? methodLabels[o.paymentMethod] : "—"}</span>
                <span><Pill tone={tone(o.status)}>{cfg.label}</Pill></span>
                <ChevronDown className={cn("h-4 w-4 text-foreground-muted transition-transform", expanded && "rotate-180")} />
              </button>
              {expanded && <div className="px-[18px] pb-4"><Details o={o} /></div>}
            </div>
          );
        })}
        {filtered.length === 0 && <div className="py-12 text-center text-sm text-foreground-muted">Nenhum pedido encontrado.</div>}
      </div>

      {/* Celular: cards */}
      <div className="flex flex-col gap-2.5 md:hidden">
        {filtered.map((o) => {
          const expanded = open === o.id;
          const cfg = statusConfig[o.status] ?? { label: o.status };
          return (
            <div key={o.id} className={cn("rounded-[14px] border bg-card", expanded ? "border-brand-border dark:border-brand/30" : "border-border")}>
              <button type="button" onClick={() => setOpen(expanded ? null : o.id)} aria-expanded={expanded} className="flex w-full items-start gap-3 p-3.5 text-left">
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="text-[13px] font-bold text-foreground">{shortId(o.id)}</span>
                    <Pill tone={tone(o.status)}>{cfg.label}</Pill>
                  </span>
                  <span className="mt-0.5 block truncate text-sm font-medium text-foreground">{o.userName}</span>
                  <span className="block truncate text-[11.5px] text-foreground-muted">{o.productTitle} · {o.paymentMethod ? methodLabels[o.paymentMethod] : "—"} · {ago(o.createdAt)}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-[15px] font-extrabold text-foreground">{formatCurrency(o.total)}</span>
                  <ChevronDown className={cn("ml-auto mt-1 h-4 w-4 text-foreground-muted transition-transform", expanded && "rotate-180")} />
                </span>
              </button>
              {expanded && <div className="border-t border-line-soft px-3.5 py-3 dark:border-white/10"><Details o={o} /></div>}
            </div>
          );
        })}
        {filtered.length === 0 && <div className="py-12 text-center text-sm text-foreground-muted">Nenhum pedido encontrado.</div>}
      </div>
    </div>
  );
}
