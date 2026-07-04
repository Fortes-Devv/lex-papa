import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getMpOrderClient, isMercadoPagoConfigured } from "@/lib/mercadopago";
import { fulfillFromMpOrder } from "@/lib/order-fulfillment";

// Consulta o status do pedido. Se ainda não estiver pago e houver mpOrderId,
// re-consulta o Mercado Pago ao vivo e atualiza o banco (funciona mesmo sem
// o webhook configurado — o webhook é só um reforço).
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const orderId = new URL(request.url).searchParams.get("orderId");
  if (!orderId) return NextResponse.json({ error: "orderId obrigatório." }, { status: 400 });

  let order = await db.order.findUnique({ where: { id: orderId } });
  if (!order || order.userId !== session.user.id) {
    return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
  }

  if (order.status !== "paid" && order.mpOrderId && isMercadoPagoConfigured()) {
    try {
      const mpOrder = await getMpOrderClient().get({ id: order.mpOrderId });
      await fulfillFromMpOrder(order.id, mpOrder);
      order = await db.order.findUnique({ where: { id: orderId } });
    } catch {
      // mantém o status atual em caso de falha de consulta
    }
  }

  return NextResponse.json({ status: order!.status });
}
