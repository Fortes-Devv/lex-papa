import { db } from "@/lib/db";
import { isEmailConfigured, sendEmail } from "@/lib/email";
import { paymentConfirmedEmailHtml } from "@/lib/email-templates";
import { siteUrl } from "@/lib/site-url";
import { formatCurrency } from "@/lib/utils/cn";

const METHOD: Record<string, string> = { pix: "Pix", credit_card: "Cartão de crédito", debit_card: "Cartão de débito", boleto: "Boleto" };

// E-mail "Pagamento confirmado" para o aluno. Chamado uma única vez, por quem
// marcou o pedido como pago. Falha aqui nunca desfaz nem trava a liberação do acesso.
export async function sendPaymentConfirmedEmail(orderId: string) {
  const baseUrl = siteUrl();
  if (!isEmailConfigured() || !baseUrl) return;
  try {
    const order = await db.order.findUnique({
      where: { id: orderId },
      select: {
        id: true, total: true, paymentMethod: true,
        user: { select: { name: true, email: true } },
        items: { select: { product: { select: { title: true, course: { select: { id: true } } } } } },
      },
    });
    if (!order) return;
    const product = order.items[0]?.product;
    const total = Number(order.total);
    const result = await sendEmail({
      to: order.user.email,
      subject: `Pagamento confirmado — ${product?.title ?? "seu curso"} liberado`,
      html: paymentConfirmedEmailHtml({
        name: order.user.name,
        courseTitle: product?.title ?? "seu curso",
        total: total === 0 ? "Grátis (cupom)" : formatCurrency(total),
        method: order.paymentMethod ? METHOD[order.paymentMethod] ?? null : null,
        orderCode: order.id.slice(-6).toUpperCase(),
        courseUrl: product?.course ? `${baseUrl}/student/course?courseId=${product.course.id}` : `${baseUrl}/student/dashboard`,
        receiptUrl: `${baseUrl}/student/orders/${order.id}`,
      }),
    });
    if (!result.sent) console.error(`[payment-email] pedido ${orderId}: ${result.reason}`);
  } catch (err) {
    console.error(`[payment-email] pedido ${orderId}:`, err);
  }
}
