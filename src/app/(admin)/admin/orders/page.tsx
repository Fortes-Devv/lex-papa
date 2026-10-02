export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { reconcilePendingOrders } from "@/lib/order-fulfillment";
import { OrdersClient, type OrderDTO } from "./orders-client";

export default async function AdminOrdersPage() {
  // Atualiza pedidos pendentes/processando com o status real do Mercado Pago
  // (pago/expirado) antes de listar, para o admin ver sempre o estado correto.
  await reconcilePendingOrders();

  const orders = await db.order.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true, email: true, avatar: true } }, items: { include: { product: { select: { title: true } } }, take: 1 } },
  });

  const dtos: OrderDTO[] = orders.map((o) => ({
    id: o.id,
    userName: o.user.name,
    userAvatar: o.user.avatar ?? undefined,
    productTitle: o.items[0]?.product.title ?? "—",
    paymentMethod: o.paymentMethod,
    total: Number(o.total),
    status: o.status,
    createdAt: o.createdAt.toISOString(),
    paidAt: o.paidAt?.toISOString() ?? null,
    email: o.user.email,
    couponCode: o.couponCode,
    discount: Number(o.discount),
    mpOrderId: o.mpOrderId,
    mpStatusDetail: o.mpStatusDetail,
  }));

  return <OrdersClient orders={dtos} />;
}
