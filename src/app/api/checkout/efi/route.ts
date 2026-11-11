import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { computeOrderTotal } from "@/lib/pricing";
import { isEnrollmentActive } from "@/lib/access";
import { cardPrice } from "@/lib/card-fee";
import { isEfiConfigured } from "@/lib/efi";
import { chargeOrderWithCard, createEfiPixForOrder, EfiCardDeclined, efiCardErrorMessage, efiErrorText } from "@/lib/efi-payments";
import { isValidCep, isValidCpf, isValidPhone, onlyDigits, UFS } from "@/lib/documents";

// Checkout pela Efí: Pix (QR de 30 minutos) e cartão de crédito avulso (até 12x).
// Pedido de R$ 0 (cupom de 100%) continua em /api/checkout/create-order.
export const maxDuration = 30;

const text = (max: number) => z.string().trim().min(1).max(max);
const cpf = z.string().refine(isValidCpf, "CPF inválido. Confira o número.").transform(onlyDigits);
const common = {
  productId: z.string().min(1).max(64),
  couponCode: z.string().trim().max(64).nullish(),
  name: text(100).refine((n) => n.split(/\s+/).length >= 2, "Informe seu nome completo."),
  cpf,
};

const payloadSchema = z.discriminatedUnion("method", [
  z.object({ ...common, method: z.literal("pix") }),
  z.object({
    ...common,
    method: z.literal("card"),
    /** payment_token gerado no navegador pelo payment-token-efi (o número do cartão nunca chega aqui). */
    token: z.string().min(8).max(500),
    installments: z.number().int().min(1, "Parcelas inválidas.").max(12, "Máximo de 12 parcelas."),
    birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data de nascimento do titular."),
    phone: z.string().refine(isValidPhone, "Confira o celular com DDD.").transform(onlyDigits),
    cep: z.string().refine(isValidCep, "Confira o CEP.").transform(onlyDigits),
    street: text(200),
    number: text(55),
    neighborhood: text(100),
    city: text(100),
    state: z.enum(UFS, { errorMap: () => ({ message: "Confira a UF (ex.: CE)." }) }),
    complement: z.string().trim().max(55).optional(),
    antifraudBlocked: z.boolean().optional(), // só para o log
  }),
]);

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Faça login para continuar." }, { status: 401 });
  if (!isEfiConfigured()) return NextResponse.json({ error: "Pagamento indisponível no momento." }, { status: 500 });

  const parsed = payloadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message;
    return NextResponse.json({ error: msg && !msg.startsWith("Invalid") && !msg.startsWith("String") ? msg : "Confira os dados do formulário." }, { status: 400 });
  }
  const body = parsed.data;

  let priced;
  try {
    priced = await computeOrderTotal(body.productId, body.couponCode);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erro ao calcular preço." }, { status: 400 });
  }
  if (priced.total <= 0) return NextResponse.json({ error: "Este pedido é gratuito: atualize a página." }, { status: 400 });

  const already = await db.enrollment.findUnique({ where: { userId_productId: { userId: session.user.id, productId: body.productId } } });
  if (isEnrollmentActive(already)) return NextResponse.json({ error: "Você já tem acesso a este curso." }, { status: 400 });

  const charged = body.method === "card" ? cardPrice(priced.total) : priced.total;
  const order = await db.order.create({
    data: {
      userId: session.user.id,
      subtotal: priced.subtotal,
      discount: priced.discount,
      total: charged,
      status: "pending",
      paymentMethod: body.method === "pix" ? "pix" : "credit_card",
      couponCode: priced.coupon?.code,
      items: { create: [{ productId: body.productId, quantity: 1, unitPrice: priced.subtotal, totalPrice: priced.subtotal, discount: priced.discount }] },
    },
  });
  const title = priced.product.title;

  if (body.method === "pix") {
    try {
      const pix = await createEfiPixForOrder({ id: order.id, total: charged }, `${title} (LEX Concursos)`, { cpf: body.cpf, name: body.name });
      return NextResponse.json({ orderId: order.id, status: "processing", pix });
    } catch (err) {
      const detail = efiErrorText(err).slice(0, 300);
      await db.order.update({ where: { id: order.id }, data: { status: "failed", mpStatusDetail: `Efí Pix: ${detail}` } });
      console.error(`[checkout-efi] falha ao gerar Pix (pedido ${order.id}): ${detail}`, err);
      const cpfProblem = /cpf|devedor/i.test(detail);
      return NextResponse.json({ error: cpfProblem ? "CPF inválido. Confira o número e tente novamente." : "Não foi possível gerar o Pix agora. Tente novamente em instantes." }, { status: 502 });
    }
  }

  try {
    const status = await chargeOrderWithCard({ id: order.id, total: charged }, title, {
      token: body.token,
      installments: body.installments,
      customer: { name: body.name, cpf: body.cpf, email: session.user.email ?? "", phone_number: body.phone, birth: body.birth },
      address: { street: body.street, number: body.number, neighborhood: body.neighborhood, zipcode: body.cep, city: body.city, state: body.state, complement: body.complement },
    });
    return NextResponse.json({ orderId: order.id, status });
  } catch (err) {
    const detail = err instanceof EfiCardDeclined ? `recusado: ${err.reason ?? "sem motivo"}` : efiErrorText(err);
    if (!(err instanceof EfiCardDeclined)) {
      await db.order.updateMany({ where: { id: order.id, status: { not: "paid" } }, data: { status: "failed", mpStatusDetail: `Efí cartão: ${detail}`.slice(0, 300) } });
    }
    console.warn(`[checkout-efi] cartão (pedido ${order.id}; antifraude ${body.antifraudBlocked ? "BLOQUEADO" : "ok"}): ${detail}`);
    return NextResponse.json({ error: efiCardErrorMessage(err), orderId: order.id }, { status: 402 });
  }
}
