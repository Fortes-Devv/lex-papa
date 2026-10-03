import { redirect } from "next/navigation";

// Endereço antigo: a confirmação do pagamento fica em /checkout/success.
export default async function LegacySuccessPage(props: { searchParams: Promise<{ order_id?: string }> }) {
  const { order_id } = await props.searchParams;
  redirect(order_id ? `/checkout/success?order_id=${encodeURIComponent(order_id)}` : "/student/dashboard");
}
