import { db } from "@/lib/db";
import { OrdersClient, type OrderDTO } from "./orders-client";

export default async function AdminOrdersPage() {
  const orders = await db.order.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: true, items: { include: { product: true }, take: 1 } },
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
  }));

  return <OrdersClient orders={dtos} />;
}
