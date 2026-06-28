"use client";
import { useState, useMemo } from "react";
import { Search, Download, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { MOCK_ORDERS } from "@/lib/mock/data";
import { formatCurrency, formatDate } from "@/lib/utils/cn";

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

export default function AdminOrdersPage() {
  const { success } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const orders = useMemo(() => {
    return MOCK_ORDERS.filter((o) => {
      const matchSearch = !search || o.user?.name.toLowerCase().includes(search.toLowerCase()) || o.id.includes(search);
      const matchStatus = !statusFilter || o.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [search, statusFilter]);

  const total = orders.filter((o) => o.status === "paid").reduce((s, o) => s + o.total, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Pedidos</h1>
          <p className="text-sm text-foreground-muted mt-0.5">
            {orders.length} pedidos · <span className="text-success font-medium">{formatCurrency(total)} confirmado</span>
          </p>
        </div>
        <Button variant="outline" leftIcon={<Download className="h-4 w-4" />}>Exportar CSV</Button>
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
            {orders.map((order) => {
              const cfg = statusConfig[order.status] ?? { label: order.status, variant: "secondary" as const };
              return (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-xs text-foreground-muted">{order.id}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar src={order.user?.avatar} name={order.user?.name} size="xs" />
                      <span className="text-sm text-foreground">{order.user?.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-foreground max-w-[180px] truncate">
                    {order.items[0]?.product?.title ?? "—"}
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
                      <Button variant="ghost" size="icon-sm" onClick={() => success("Reembolso iniciado.")} title="Reembolsar">
                        <RefreshCcw className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
