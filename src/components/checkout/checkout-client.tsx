"use client";
import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import Image from "next/image";
import Link from "next/link";
import { Lock, AlertTriangle, Copy, ExternalLink, Loader2, Check, ChevronLeft, QrCode, CreditCard, FileText } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { formatCurrency, cn } from "@/lib/utils/cn";
import { applyCoupon, saveCheckoutPhone } from "@/lib/actions/checkout";
import { CdnImg } from "@/components/ui/cdn-img";
import { cardPrice } from "@/lib/card-fee";

interface MpInstance {
  createCardToken: (data: Record<string, string>) => Promise<{ id: string }>;
  getPaymentMethods: (opts: { bin: string }) => Promise<{ results: Array<{ id: string; payment_type_id: string }> }>;
  getInstallments: (opts: { amount: string; bin: string; paymentTypeId?: string }) => Promise<Array<{ payer_costs: Array<{ installments: number; recommended_message: string; total_amount: number; installment_amount: number; installment_rate: number }> }>>;
}
declare global {
  interface Window {
    MercadoPago?: new (publicKey: string, opts?: { locale?: string }) => MpInstance;
  }
}

interface CheckoutClientProps {
  product: { id: string; title: string; slug: string; thumbnail: string; price: number; comparePrice: number | null; accessType: string };
  payerEmail: string;
  payerName: string;
  payerPhone: string;
  mpPublicKey: string;
}

type Method = "pix" | "card" | "boleto";
type PixResult = { qrCode: string; qrCodeBase64?: string };
type BoletoResult = { url: string; digitableLine?: string };

const onlyDigits = (s: string) => s.replace(/\D/g, "");
// 0000 0000 0000 0000
const formatCardNumber = (s: string) => onlyDigits(s).slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
// 000.000.000-00
const formatCpf = (s: string) => {
  const d = onlyDigits(s).slice(0, 11);
  return d.replace(/^(\d{3})(\d)/, "$1.$2").replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1-$2");
};
// (85) 99999-9999
const formatPhone = (s: string) => {
  const d = onlyDigits(s).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}`;
};

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-semibold text-foreground">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-foreground-muted">{hint}</span>}
    </label>
  );
}
const inputCls = "h-11 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none placeholder:text-foreground-muted focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-background disabled:text-foreground-muted";

// Checkout (modelo 7h): uma página — dados e pagamento à esquerda, resumo fixo à direita; Pix como padrão.
export function CheckoutClient({ product, payerEmail, payerName, payerPhone, mpPublicKey }: CheckoutClientProps) {
  const { error: toastError, success } = useToast();
  const mpRef = useRef<MpInstance | null>(null);
  const [sdkReady, setSdkReady] = useState(false);

  const [coupon, setCoupon] = useState("");
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [discount, setDiscount] = useState(0);
  const [couponLoading, setCouponLoading] = useState(false);

  const [method, setMethod] = useState<Method>("pix");
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  const [name, setName] = useState(payerName);
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState(payerPhone ? formatPhone(payerPhone) : "");
  const [card, setCard] = useState({ number: "", name: payerName, month: "", year: "", cvv: "" });

  const [paymentMethodId, setPaymentMethodId] = useState<string | null>(null);
  const [installmentOptions, setInstallmentOptions] = useState<Array<{ installments: number; label: string; totalAmount: number; hasInterest: boolean }>>([]);
  const [installments, setInstallments] = useState(1);

  const [pixResult, setPixResult] = useState<PixResult | null>(null);
  const [boletoResult, setBoletoResult] = useState<BoletoResult | null>(null);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);

  const total = Math.max(product.price - discount, 0);
  const isFree = total === 0 && discount > 0;
  const selectedInst = installmentOptions.find((o) => o.installments === installments);
  // No cartão, o preço embute a tarifa do MP; os juros das parcelas vêm por cima disso.
  const cardTotal = cardPrice(total);
  const chargeAmount = method === "card" ? (selectedInst && selectedInst.installments > 1 ? selectedInst.totalAmount : cardTotal) : total;
  const launchDiscount = product.comparePrice && product.comparePrice > product.price ? product.comparePrice - product.price : 0;

  useEffect(() => {
    if (sdkReady && mpPublicKey && window.MercadoPago && !mpRef.current) {
      mpRef.current = new window.MercadoPago(mpPublicKey, { locale: "pt-BR" });
    }
  }, [sdkReady, mpPublicKey]);

  async function handleApplyCoupon() {
    if (!coupon) return;
    setCouponLoading(true);
    const result = await applyCoupon(product.id, coupon);
    setCouponLoading(false);
    if (!result.success) { toastError(result.error); return; }
    setCouponCode(result.couponCode);
    setDiscount(result.discount);
    setInstallmentOptions([]); // parcelas dependem do valor: recalcula ao redigitar o cartão
  }

  // Com o BIN (6 primeiros dígitos), busca bandeira e parcelas reais no Mercado Pago.
  async function handleBinLookup(numberDigits: string) {
    const bin = numberDigits.slice(0, 6);
    if (bin.length < 6 || !mpRef.current) return;
    try {
      const methods = await mpRef.current.getPaymentMethods({ bin });
      const pm = methods.results?.[0];
      if (pm) setPaymentMethodId(pm.id);
      const inst = await mpRef.current.getInstallments({ amount: cardTotal.toFixed(2), bin, paymentTypeId: "credit_card" });
      const costs = inst?.[0]?.payer_costs ?? [];
      // Até 12x. O comprador paga os juros (financiamento do MP) sobre o preço no cartão.
      setInstallmentOptions(costs.filter((c) => c.installments <= 12).map((c) => ({
        installments: c.installments, label: c.recommended_message, totalAmount: c.total_amount, hasInterest: c.installment_rate > 0,
      })));
    } catch {
      // silencioso — o aluno ainda pode tentar enviar
    }
  }

  function pollStatus(orderId: string) {
    setPendingOrderId(orderId);
    const started = Date.now();
    const timer = setInterval(async () => {
      if (Date.now() - started > 1000 * 60 * 15) { clearInterval(timer); return; } // desiste após 15 min
      try {
        const res = await fetch(`/api/checkout/order-status?orderId=${orderId}`);
        const data = await res.json();
        if (data.status === "paid") {
          clearInterval(timer);
          window.location.href = `/checkout/success?order_id=${orderId}`;
        }
      } catch { /* continua tentando */ }
    }, 4000);
  }

  function validate(): string | null {
    if (!accepted) return "Aceite os Termos de uso e a Política de privacidade para continuar.";
    if (isFree) return null;
    if (name.trim().split(/\s+/).length < 2) return "Informe seu nome completo.";
    if (onlyDigits(cpf).length !== 11) return "Informe um CPF válido (11 dígitos).";
    if (method === "card" && (!card.number || !card.name || !card.month || !card.year || !card.cvv)) return "Preencha todos os dados do cartão.";
    return null;
  }

  async function submit() {
    const problem = validate();
    if (problem) { setSubmitError(problem); return; }
    setSubmitError(null);
    if (phone && onlyDigits(phone).length >= 10 && onlyDigits(phone) !== onlyDigits(payerPhone)) saveCheckoutPhone(phone).catch(() => {});
    if (isFree) return handleFreeEnroll();
    if (method === "card") return handlePayCard();
    return handlePayPixOrBoleto(method);
  }

  async function handlePayCard() {
    if (!mpRef.current) { setSubmitError("Aguarde o carregamento do formulário de pagamento."); return; }
    setLoading(true);
    try {
      const token = await mpRef.current.createCardToken({
        cardNumber: onlyDigits(card.number),
        cardholderName: card.name,
        cardExpirationMonth: card.month.padStart(2, "0"),
        cardExpirationYear: card.year.length === 2 ? `20${card.year}` : card.year,
        securityCode: card.cvv,
        identificationType: "CPF",
        identificationNumber: onlyDigits(cpf),
      });
      const res = await fetch("/api/checkout/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id, couponCode, method: "card", token: token.id, installments, paymentMethodId: paymentMethodId ?? "visa",
          payer: { email: payerEmail, identificationType: "CPF", identificationNumber: onlyDigits(cpf) },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao processar pagamento.");
      if (data.status === "processed") window.location.href = `/checkout/success?order_id=${data.orderId}`;
      else if (["failed", "cancelled"].includes(data.status)) setSubmitError("Pagamento não aprovado. Verifique os dados do cartão ou tente outro.");
      else pollStatus(data.orderId); // em processamento — acompanha
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Erro ao processar o cartão.");
    } finally {
      setLoading(false);
    }
  }

  // Cupom de 100%: não há cobrança, o servidor libera o acesso direto.
  async function handleFreeEnroll() {
    setLoading(true);
    try {
      const res = await fetch("/api/checkout/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, couponCode, method: "free" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Não foi possível liberar o acesso.");
      window.location.href = `/checkout/success?order_id=${data.orderId}`;
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Não foi possível liberar o acesso.");
      setLoading(false);
    }
  }

  async function handlePayPixOrBoleto(m: "pix" | "boleto") {
    const [firstName, ...rest] = name.trim().split(/\s+/);
    setLoading(true);
    try {
      const res = await fetch("/api/checkout/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id, couponCode, method: m,
          payer: { email: payerEmail, firstName, lastName: rest.join(" "), identificationType: "CPF", identificationNumber: onlyDigits(cpf) },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao gerar pagamento.");
      if (m === "pix" && data.pix) setPixResult(data.pix);
      if (m === "boleto" && data.boleto) setBoletoResult(data.boleto);
      pollStatus(data.orderId);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Erro ao gerar pagamento.");
    } finally {
      setLoading(false);
    }
  }

  const methods: { id: Method; label: string; hint: string; icon: React.ReactNode; value: string }[] = [
    { id: "pix", label: "Pix", hint: "Aprovação na hora", icon: <QrCode className="h-5 w-5" />, value: formatCurrency(total) },
    { id: "card", label: "Cartão de crédito", hint: "em até 12x", icon: <CreditCard className="h-5 w-5" />, value: selectedInst && selectedInst.installments > 1 ? selectedInst.label : formatCurrency(cardTotal) },
    { id: "boleto", label: "Boleto", hint: "libera em até 3 dias úteis", icon: <FileText className="h-5 w-5" />, value: formatCurrency(total) },
  ];
  const cta = isFree ? "Liberar meu acesso" : method === "pix" ? "Gerar Pix e liberar acesso" : method === "boleto" ? "Gerar boleto" : `Pagar ${formatCurrency(chargeAmount)}`;
  const step = pixResult || boletoResult ? 3 : 2;

  const summary = (
    <div className="space-y-4 rounded-[14px] border border-border bg-card p-5 shadow-[0_6px_24px_rgba(31,43,58,.06)]">
      <div className="flex items-center gap-3">
        <CdnImg src={product.thumbnail} width={96} alt="" className="h-12 w-12 shrink-0 rounded-xl bg-navy object-cover" />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-foreground">{product.title}</p>
          <p className="text-xs text-foreground-muted">Curso completo · acesso por 1 ano</p>
        </div>
      </div>

      {!pixResult && !boletoResult && (
        <div>
          <span className="mb-1.5 block text-[13px] font-semibold text-foreground">Cupom</span>
          {couponCode ? (
            <div className="flex items-center justify-between rounded-lg bg-ok-soft px-3 py-2 text-sm dark:bg-ok/15">
              <span className="font-semibold text-ok-text dark:text-ok">✓ {couponCode}</span>
              <button type="button" onClick={() => { setCouponCode(null); setDiscount(0); setCoupon(""); setInstallmentOptions([]); }} className="text-xs text-foreground-muted hover:text-danger">Remover</button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} onKeyDown={(e) => { if (e.key === "Enter") handleApplyCoupon(); }} placeholder="SEUCODIGO" className={cn(inputCls, "h-10")} />
              <button type="button" onClick={handleApplyCoupon} disabled={couponLoading || !coupon} className="h-10 shrink-0 rounded-lg border border-line-strong px-3.5 text-[13px] font-semibold text-foreground disabled:opacity-50 dark:border-white/10">
                {couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aplicar"}
              </button>
            </div>
          )}
        </div>
      )}

      <dl className="space-y-2 border-t border-line-soft pt-4 text-sm dark:border-white/10">
        <div className="flex justify-between"><dt className="text-foreground-muted">Curso</dt><dd className="text-foreground">{formatCurrency(product.comparePrice && launchDiscount ? product.comparePrice : product.price)}</dd></div>
        {launchDiscount > 0 && <div className="flex justify-between text-ok-text dark:text-ok"><dt>Desconto de lançamento</dt><dd>− {formatCurrency(launchDiscount)}</dd></div>}
        {discount > 0 && <div className="flex justify-between text-ok-text dark:text-ok"><dt>Cupom {couponCode}</dt><dd>− {formatCurrency(discount)}</dd></div>}
        {method === "card" && cardTotal > total && <div className="flex justify-between text-foreground-muted"><dt>Taxa do cartão</dt><dd>+ {formatCurrency(cardTotal - total)}</dd></div>}
        {method === "card" && chargeAmount > cardTotal && <div className="flex justify-between text-foreground-muted"><dt>Juros do parcelamento</dt><dd>+ {formatCurrency(chargeAmount - cardTotal)}</dd></div>}
        <div className="flex items-baseline justify-between border-t border-line-soft pt-3 dark:border-white/10">
          <dt className="font-bold text-foreground">Total</dt>
          <dd className="text-[24px] font-extrabold text-foreground">{formatCurrency(chargeAmount)}</dd>
        </div>
      </dl>

      {!pixResult && !boletoResult && (mpPublicKey || isFree) && (
        <>
          <button type="button" onClick={submit} disabled={loading}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand text-[15px] font-bold text-white shadow-[0_6px_16px_rgba(242,106,27,.3)] hover:bg-brand-dark disabled:opacity-70">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Lock className="h-4 w-4" />} {cta}
          </button>
          {submitError && <p className="text-sm text-danger" role="alert">{submitError}</p>}
        </>
      )}
      <p className="text-center text-xs text-foreground-muted">Pagamento processado pelo Mercado Pago com criptografia. Não guardamos dados do seu cartão.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Script src="https://sdk.mercadopago.com/js/v2" onReady={() => setSdkReady(true)} />

      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-[1100px] items-center gap-4 px-4 lg:px-8">
          <Link href={`/cursos/${product.slug}`} className="flex items-center gap-2.5" aria-label="Voltar ao curso">
            <ChevronLeft className="h-4 w-4 text-foreground-muted" />
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-navy"><Image src="/logo.png" alt="" width={26} height={22} className="object-contain" /></span>
            <span className="hidden text-[15px] font-extrabold text-foreground sm:inline">Finalizar compra</span>
          </Link>
          <ol className="mx-auto hidden items-center gap-2 text-[13px] font-semibold md:flex" aria-label="Etapas">
            {["Curso", "Pagamento", "Acesso"].map((label, i) => {
              const n = i + 1;
              const done = n < step;
              const active = n === step;
              return (
                <li key={label} className="flex items-center gap-2">
                  {i > 0 && <span className="h-px w-8 bg-line-strong dark:bg-white/20" />}
                  <span className={cn("grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold", done ? "bg-ok text-white" : active ? "bg-brand text-white" : "bg-background text-foreground-muted ring-1 ring-line-strong")}>
                    {done ? <Check className="h-3.5 w-3.5" /> : n}
                  </span>
                  <span className={active ? "text-foreground" : "text-foreground-muted"}>{label}</span>
                </li>
              );
            })}
          </ol>
          <span className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-ok-text dark:text-ok md:ml-0"><Lock className="h-3.5 w-3.5" /> Ambiente seguro</span>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1100px] gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8 lg:px-8 lg:py-8">
        <div className="min-w-0 space-y-4">
          {pixResult ? (
            <PixDisplay pix={pixResult} total={total} onCopy={() => { navigator.clipboard.writeText(pixResult.qrCode); success("Código Pix copiado!"); }} />
          ) : boletoResult ? (
            <BoletoDisplay boleto={boletoResult} onCopy={() => { if (boletoResult.digitableLine) { navigator.clipboard.writeText(boletoResult.digitableLine); success("Linha digitável copiada!"); } }} />
          ) : (
            <>
              {/* 1. Seus dados */}
              <section className="rounded-[14px] border border-border bg-card p-5">
                <div className="mb-4 flex items-baseline justify-between gap-3">
                  <h2 className="text-[17px] font-extrabold text-foreground">1. Seus dados</h2>
                  <span className="truncate text-xs text-foreground-muted">Logado como {payerName.split(" ")[0] || payerEmail}</span>
                </div>
                {isFree ? (
                  <p className="text-sm text-foreground-muted">O acesso será liberado na conta <b className="text-foreground">{payerEmail}</b>.</p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Nome completo"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></Field>
                    <Field label="CPF"><input className={inputCls} value={cpf} onChange={(e) => setCpf(formatCpf(e.target.value))} inputMode="numeric" placeholder="000.000.000-00" /></Field>
                    <Field label="E-mail" hint="O acesso e o recibo vão para este e-mail."><input className={inputCls} value={payerEmail} disabled /></Field>
                    <Field label="WhatsApp (opcional)"><input className={inputCls} value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} inputMode="tel" placeholder="(85) 99999-9999" autoComplete="tel" /></Field>
                  </div>
                )}
              </section>

              {/* 2. Pagamento */}
              {isFree ? (
                <section className="rounded-[14px] border border-ok/40 bg-ok-soft/60 p-5 dark:bg-ok/10">
                  <p className="font-bold text-foreground">Seu cupom cobre 100% do valor 🎉</p>
                  <p className="mt-1 text-sm text-foreground-muted">Não é preciso pagar nada. Aceite os termos e clique em “Liberar meu acesso”.</p>
                </section>
              ) : !mpPublicKey ? (
                <div className="flex items-start gap-3 rounded-[14px] border border-brand-border bg-brand-soft p-4 text-sm dark:bg-brand/10">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                  <div>
                    <p className="font-semibold text-foreground">Pagamento ainda não configurado.</p>
                    <p className="mt-1 text-xs text-foreground-muted">Defina as variáveis do Mercado Pago no ambiente.</p>
                  </div>
                </div>
              ) : (
                <section className="rounded-[14px] border border-border bg-card p-5">
                  <h2 className="mb-4 text-[17px] font-extrabold text-foreground">2. Pagamento</h2>
                  <div className="space-y-2" role="radiogroup" aria-label="Forma de pagamento">
                    {methods.map((m) => (
                      <button key={m.id} type="button" role="radio" aria-checked={method === m.id} onClick={() => { setMethod(m.id); setSubmitError(null); }}
                        className={cn("flex w-full items-center gap-3 rounded-xl border-2 p-3.5 text-left transition-colors",
                          method === m.id ? "border-brand bg-brand-soft/50 dark:bg-brand/10" : "border-border hover:border-line-strong")}>
                        <span className={cn("grid h-5 w-5 shrink-0 place-items-center rounded-full border-2", method === m.id ? "border-brand" : "border-line-strong")}>
                          {method === m.id && <span className="h-2.5 w-2.5 rounded-full bg-brand" />}
                        </span>
                        <span className={cn("shrink-0", method === m.id ? "text-brand" : "text-foreground-muted")}>{m.icon}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-bold text-foreground">{m.label}</span>
                          <span className="block text-xs text-foreground-muted">{m.hint}</span>
                        </span>
                        <span className="shrink-0 text-sm font-bold text-foreground">{m.value}</span>
                      </button>
                    ))}
                  </div>

                  {method === "pix" && (
                    <p className="mt-4 rounded-lg bg-background p-3 text-xs text-foreground-muted">
                      O QR Code aparece depois que você confirmar. O acesso ao curso é liberado automaticamente em segundos após o pagamento, e você recebe a confirmação por e-mail.
                    </p>
                  )}
                  {method === "boleto" && (
                    <p className="mt-4 rounded-lg bg-background p-3 text-xs text-foreground-muted">
                      O boleto vence em 3 dias. A compensação leva até 3 dias úteis e o acesso é liberado automaticamente depois disso.
                    </p>
                  )}
                  {method === "card" && (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <Field label="Número do cartão">
                          <input className={inputCls} placeholder="0000 0000 0000 0000" inputMode="numeric" maxLength={19} autoComplete="cc-number" value={card.number}
                            onChange={(e) => setCard((c) => ({ ...c, number: formatCardNumber(e.target.value) }))} onBlur={() => handleBinLookup(onlyDigits(card.number))} />
                        </Field>
                      </div>
                      <div className="sm:col-span-2">
                        <Field label="Nome impresso no cartão"><input className={inputCls} autoComplete="cc-name" value={card.name} onChange={(e) => setCard((c) => ({ ...c, name: e.target.value }))} /></Field>
                      </div>
                      <Field label="Validade">
                        <input className={inputCls} placeholder="MM/AA" inputMode="numeric" maxLength={5} autoComplete="cc-exp"
                          value={card.year ? `${card.month}/${card.year}` : card.month}
                          onChange={(e) => {
                            const d = onlyDigits(e.target.value).slice(0, 4); // MMAA
                            let mm = d.slice(0, 2);
                            const yy = d.slice(2, 4);
                            if (mm.length === 2 && Number(mm) > 12) mm = "12";
                            setCard((c) => ({ ...c, month: mm, year: yy }));
                          }} />
                      </Field>
                      <Field label="CVV"><input className={inputCls} placeholder="123" inputMode="numeric" maxLength={4} autoComplete="cc-csc" value={card.cvv} onChange={(e) => setCard((c) => ({ ...c, cvv: onlyDigits(e.target.value).slice(0, 4) }))} /></Field>
                      {installmentOptions.length > 0 && (
                        <div className="sm:col-span-2">
                          <Field label="Parcelas" hint={selectedInst && selectedInst.installments > 1 ? `Total no cartão: ${formatCurrency(selectedInst.totalAmount)}${selectedInst.hasInterest ? " (com juros do cartão)" : " (sem juros)"}` : undefined}>
                            <select className={inputCls} value={installments} onChange={(e) => setInstallments(Number(e.target.value))}>
                              {installmentOptions.map((o) => <option key={o.installments} value={o.installments}>{o.label}</option>)}
                            </select>
                          </Field>
                        </div>
                      )}
                      <p className="text-xs text-foreground-muted sm:col-span-2">O CPF do titular é o informado em “Seus dados”.</p>
                    </div>
                  )}
                </section>
              )}

              {/* Aceite */}
              <label className="flex cursor-pointer items-start gap-3 rounded-[14px] border border-border bg-card p-4 text-sm text-foreground">
                <input type="checkbox" checked={accepted} onChange={(e) => { setAccepted(e.target.checked); setSubmitError(null); }} className="mt-0.5 h-4 w-4 shrink-0 accent-[#f26a1b]" />
                <span>
                  Li e aceito os <Link href="/termos" target="_blank" className="font-semibold text-brand underline">Termos de uso</Link> e a{" "}
                  <Link href="/privacidade" target="_blank" className="font-semibold text-brand underline">Política de privacidade</Link>. Garantia de 7 dias com devolução total.
                </span>
              </label>
            </>
          )}
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">{summary}</aside>
      </div>

      {pendingOrderId && (pixResult || boletoResult) && <span className="sr-only" aria-live="polite">Aguardando confirmação do pagamento</span>}
    </div>
  );
}

function PixDisplay({ pix, total, onCopy }: { pix: PixResult; total: number; onCopy: () => void }) {
  return (
    <section className="rounded-[14px] border border-border bg-card p-6 text-center">
      <p className="text-[11px] font-bold uppercase tracking-wider text-brand">Pix gerado</p>
      <h2 className="mt-1 text-[22px] font-extrabold text-foreground">Pague {formatCurrency(total)} com Pix</h2>
      <p className="mt-1 text-sm text-foreground-muted">Abra o app do seu banco, escaneie o QR Code ou use o “copia e cola”. O código vale por 30 minutos.</p>
      {/* eslint-disable-next-line @next/next/no-img-element -- QR Code em base64 gerado na hora */}
      {pix.qrCodeBase64 && <img src={`data:image/png;base64,${pix.qrCodeBase64}`} alt="QR Code Pix" className="mx-auto mt-5 h-56 w-56 rounded-xl border border-border bg-white p-2" />}
      <div className="mx-auto mt-5 flex max-w-md items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
        <code className="flex-1 truncate text-left font-mono text-xs text-foreground">{pix.qrCode}</code>
      </div>
      <button type="button" onClick={onCopy} className="mx-auto mt-3 flex h-11 items-center gap-2 rounded-xl bg-brand px-5 text-sm font-bold text-white hover:bg-brand-dark">
        <Copy className="h-4 w-4" /> Copiar código Pix
      </button>
      <p className="mt-5 flex items-center justify-center gap-2 text-sm font-semibold text-foreground">
        <Loader2 className="h-4 w-4 animate-spin text-brand" /> Aguardando o pagamento… esta tela muda sozinha.
      </p>
      <p className="mt-1 text-xs text-foreground-muted">Assim que o banco confirmar, o curso é liberado e você recebe um e-mail.</p>
    </section>
  );
}

function BoletoDisplay({ boleto, onCopy }: { boleto: BoletoResult; onCopy: () => void }) {
  return (
    <section className="rounded-[14px] border border-border bg-card p-6 text-center">
      <p className="text-[11px] font-bold uppercase tracking-wider text-brand">Boleto gerado</p>
      <h2 className="mt-1 text-[22px] font-extrabold text-foreground">Pague o boleto para liberar o curso</h2>
      <a href={boleto.url} target="_blank" rel="noopener noreferrer" className="mx-auto mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-brand px-5 text-sm font-bold text-white hover:bg-brand-dark">
        <ExternalLink className="h-4 w-4" /> Abrir / imprimir boleto
      </a>
      {boleto.digitableLine && (
        <div className="mx-auto mt-4 flex max-w-md items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
          <code className="flex-1 truncate text-left font-mono text-xs text-foreground">{boleto.digitableLine}</code>
          <button type="button" onClick={onCopy} className="shrink-0 text-foreground-muted hover:text-foreground" aria-label="Copiar linha digitável"><Copy className="h-4 w-4" /></button>
        </div>
      )}
      <p className="mt-4 text-xs text-foreground-muted">A compensação leva até 3 dias úteis. O acesso é liberado automaticamente e você recebe a confirmação por e-mail.</p>
    </section>
  );
}
