export const dynamic = "force-dynamic";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireArea } from "@/lib/auth-guards";
import { db } from "@/lib/db";
import { isStaffRole } from "@/lib/access";
import { getSettings } from "@/lib/settings";
import { formatCurrency } from "@/lib/utils/cn";
import { PrintButton } from "./print-button";

const METHOD: Record<string, string> = { pix: "Pix", credit_card: "Cartão de crédito", debit_card: "Cartão de débito", boleto: "Boleto" };

// Recibo do pedido (Perfil › Meus acessos / Pagamentos). Só o dono do pedido ou a equipe.
export default async function OrderReceiptPage(props: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await props.params;
  const session = await requireArea("student");
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { user: { select: { name: true, email: true } }, items: { include: { product: { select: { title: true } } } } },
  });
  if (!order || (order.userId !== session.user.id && !isStaffRole(session.user.role)) || order.status !== "paid") notFound();
  const { company, general } = await getSettings();
  const when = (d: Date) => d.toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short", timeZone: "America/Fortaleza" });

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <Link href="/student/profile?secao=pagamentos" className="inline-flex items-center gap-1 text-sm font-semibold text-foreground-muted"><ChevronLeft className="h-4 w-4" /> Pagamentos</Link>
        <PrintButton />
      </div>
      <article className="rounded-[14px] border border-border bg-card p-6 text-sm text-foreground print:border-0 print:p-0">
        <header className="flex items-start justify-between gap-4 border-b border-border pb-4">
          <div>
            <p className="text-lg font-extrabold">Recibo</p>
            <p className="text-xs text-foreground-muted">Pedido #{order.id.slice(-6).toUpperCase()} · {when(order.paidAt ?? order.createdAt)}</p>
          </div>
          <div className="text-right text-xs text-foreground-muted">
            <p className="font-bold text-foreground">{company.legalName || general.name}</p>
            {company.cnpj && <p>CNPJ {company.cnpj}</p>}
            {company.address && <p>{company.address}</p>}
            {(company.contactEmail || general.supportEmail) && <p>{company.contactEmail || general.supportEmail}</p>}
          </div>
        </header>
        <dl className="grid grid-cols-2 gap-4 border-b border-border py-4 text-xs">
          <div><dt className="font-bold uppercase tracking-wider text-foreground-muted">Aluno</dt><dd className="mt-1 text-sm">{order.user.name}<br /><span className="text-foreground-muted">{order.user.email}</span></dd></div>
          <div><dt className="font-bold uppercase tracking-wider text-foreground-muted">Pagamento</dt><dd className="mt-1 text-sm">{order.paymentMethod ? METHOD[order.paymentMethod] ?? order.paymentMethod : "—"}<br /><span className="text-foreground-muted">Pago em {when(order.paidAt ?? order.createdAt)}</span></dd></div>
        </dl>
        <table className="w-full py-4">
          <tbody>
            {order.items.map((i) => (
              <tr key={i.id}><td className="py-2">{i.product.title}</td><td className="py-2 text-right">{formatCurrency(Number(i.unitPrice) * i.quantity)}</td></tr>
            ))}
            {Number(order.discount) > 0 && <tr className="text-foreground-muted"><td className="py-1">Desconto{order.couponCode ? ` (${order.couponCode})` : ""}</td><td className="py-1 text-right">− {formatCurrency(Number(order.discount))}</td></tr>}
            <tr className="border-t border-border font-extrabold"><td className="pt-3">Total pago</td><td className="pt-3 text-right">{formatCurrency(Number(order.total))}</td></tr>
          </tbody>
        </table>
      </article>
    </div>
  );
}
