"use client";
import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, Download, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { refundOrder } from "@/lib/actions/orders";
import { formatCurrency, formatDate } from "@/lib/utils/cn";

export interface OrderDTO {
  id: string;
  userName: string;
  userAvatar?: string;
  productTitle: string;
  paymentMethod: string | null;
  total: number;
  status: string;
  createdAt: string;
}

const statusConfig: Record<string, { label: string; variant: "success"|"warning"|"destructive"|"secondary"|"info" }> = {
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

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const matchSearch = !search || o.userName.toLowerCase().includes(search.toLowerCase()) || o.id.includes(search);
      const matchStatus = !statusFilter || o.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [orders, search, statusFilter]);

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

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Pedidos</h1>
          <p className="text-sm text-foreground-muted mt-0.5">
            {filtered.length} pedidos · <span className="text-success font-medium">{formatCurrency(totalConfirmed)} confirmado</span>
          </p>
        </div>
        <Button variant="outline" leftIcon={<Download className="h-4 w-4" />} onClick={handleExport}>Exportar CSV</Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px] max-w-xs">
          <Input placeholder="Buscar por nome ou ID..." leftIcon={<Search className="h-4 w-4" />} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select
          options={Object.entries(statusConfig).map(([v, c]) => ({ value: v, label: c.label }))}
          placeholder="Status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-40"
        />
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Método</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((order) => {
              const cfg = statusConfig[order.status] ?? { label: order.status, variant: "secondary" as const };
              return (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-xs text-foreground-muted">{order.id}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar src={order.userAvatar} name={order.userName} size="xs" />
                      <span className="text-sm text-foreground">{order.userName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-foreground max-w-[180px] truncate">
                    {order.productTitle}
                  </TableCell>
                  <TableCell className="text-sm text-foreground-muted">
                    {order.paymentMethod ? methodLabels[order.paymentMethod] : "—"}
                  </TableCell>
                  <TableCell className="font-semibold text-sm text-foreground">
                    {formatCurrency(order.total)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={cfg.variant} dot>{cfg.label}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-foreground-muted">
                    {formatDate(order.createdAt)}
                  </TableCell>
                  <TableCell>
                    {order.status === "paid" && (
                      <Button variant="ghost" size="icon-sm" disabled={isPending} onClick={() => handleRefund(order.id)} title="Reembolsar">
                        <RefreshCcw className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-foreground-muted py-8">Nenhum pedido encontrado.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
