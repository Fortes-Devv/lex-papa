import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Clock, XCircle, BookOpen, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatCurrency } from "@/lib/utils/cn";
import { SuccessPoller } from "@/components/checkout/success-poller";

export default async function CheckoutSuccessPage({ searchParams }: { searchParams: { order_id?: string } }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!searchParams.order_id) redirect("/");

  const order = await db.order.findUnique({
    where: { id: searchParams.order_id },
    include: { items: { include: { product: true } } },
  });

  if (!order || order.userId !== session.user.id) redirect("/");

  const mainItem = order.items[0];
  const isPaid = order.status === "paid";
  const isFailed = order.status === "failed" || order.status === "cancelled";
  const isPending = !isPaid && !isFailed;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {isPending && <SuccessPoller orderId={order.id} />}
      <div className="w-full max-w-md text-center space-y-6">
        <div className={`mx-auto h-20 w-20 rounded-full flex items-center justify-center ${isPaid ? "bg-success/10" : isFailed ? "bg-destructive/10" : "bg-warning/10"}`}>
          {isPaid ? <CheckCircle2 className="h-10 w-10 text-success" /> : isFailed ? <XCircle className="h-10 w-10 text-destructive" /> : <Clock className="h-10 w-10 text-warning" />}
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            {isPaid ? "Pagamento confirmado!" : isFailed ? "Pagamento não aprovado" : "Pagamento em processamento"}
          </h1>
          <p className="text-foreground-muted text-sm">
            {isPaid && <>Sua compra de <strong>{mainItem?.product.title}</strong> foi processada com sucesso.</>}
            {isFailed && "Não conseguimos confirmar o pagamento. Tente novamente ou use outro método."}
            {isPending && "Assim que o pagamento for confirmado (PIX/boleto podem levar alguns minutos), esta página atualiza automaticamente."}
          </p>
        </div>

        {mainItem && (
          <div className="rounded-lg border border-border bg-card p-4 text-left space-y-3">
            <div className="flex items-center gap-3">
              <img src={mainItem.product.thumbnail} className="h-12 w-20 rounded object-cover" alt={mainItem.product.title} />
              <div>
                <p className="text-sm font-semibold text-foreground">{mainItem.product.title}</p>
                <p className="text-xs text-foreground-muted">{formatCurrency(Number(order.total))} · Acesso vitalício</p>
              </div>
            </div>
            <p className="text-xs text-foreground-muted">
              Número do pedido: <strong className="font-mono text-foreground">{order.id}</strong>
            </p>
          </div>
        )}

        {isPaid && (
          <Link href="/student/dashboard">
            <Button className="w-full" size="lg" rightIcon={<ArrowRight className="h-4 w-4" />}>
              <BookOpen className="h-4 w-4" />
              Começar a aprender
            </Button>
          </Link>
        )}
        {isFailed && (
          <Link href={`/checkout?productId=${mainItem?.productId}`}>
            <Button className="w-full" size="lg">Tentar novamente</Button>
          </Link>
        )}

        <p className="text-xs text-foreground-muted">
          Dúvidas?{" "}
          <a href="mailto:suporte@lexconcursos.com" className="text-primary hover:underline">suporte@lexconcursos.com</a>
        </p>
      </div>
    </div>
  );
}
