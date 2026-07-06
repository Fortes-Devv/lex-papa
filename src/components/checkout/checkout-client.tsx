"use client";
import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import Image from "next/image";
import { Lock, Tag, AlertTriangle, CreditCard, QrCode, FileText, Copy, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/ui/back-button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { formatCurrency, cn } from "@/lib/utils/cn";
import { applyCoupon } from "@/lib/actions/checkout";

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
  product: { id: string; title: string; thumbnail: string; price: number; rating: number; reviewCount: number; enrolledCount: number };
  payerEmail: string;
  payerName: string;
  mpPublicKey: string;
}

type Method = "card" | "pix" | "boleto";
type PixResult = { qrCode: string; qrCodeBase64?: string };
type BoletoResult = { url: string; digitableLine?: string };

const onlyDigits = (s: string) => s.replace(/\D/g, "");
// Formata o número do cartão em grupos de 4 (máx 16 dígitos): 0000 0000 0000 0000
const formatCardNumber = (s: string) => onlyDigits(s).slice(0, 16).replace(/(.{4})/g, "$1 ").trim();

export function CheckoutClient({ product, payerEmail, payerName, mpPublicKey }: CheckoutClientProps) {
  const { error: toastError, success } = useToast();
  const mpRef = useRef<MpInstance | null>(null);
  const [sdkReady, setSdkReady] = useState(false);

  const [coupon, setCoupon] = useState("");
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [discount, setDiscount] = useState(0);
  const [couponLoading, setCouponLoading] = useState(false);

  const [method, setMethod] = useState<Method>("card");
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [firstName, ...rest] = payerName.split(" ");
  const [card, setCard] = useState({ number: "", name: payerName, month: "", year: "", cvv: "", cpf: "" });
  const [payer, setPayer] = useState({ firstName: firstName ?? "", lastName: rest.join(" "), cpf: "" });

  const [paymentMethodId, setPaymentMethodId] = useState<string | null>(null);
  const [installmentOptions, setInstallmentOptions] = useState<Array<{ installments: number; label: string; totalAmount: number; hasInterest: boolean }>>([]);
  const [installments, setInstallments] = useState(1);

  const [pixResult, setPixResult] = useState<PixResult | null>(null);
  const [boletoResult, setBoletoResult] = useState<BoletoResult | null>(null);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);

  const total = Math.max(product.price - discount, 0);
  const selectedInst = installmentOptions.find((o) => o.installments === installments);
  const chargeAmount = selectedInst && selectedInst.installments > 1 ? selectedInst.totalAmount : total;

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
  }

  // Ao digitar o BIN (6 primeiros dígitos), busca bandeira e parcelas reais no MP.
  async function handleBinLookup(numberDigits: string) {
    const bin = numberDigits.slice(0, 6);
    if (bin.length < 6 || !mpRef.current) return;
    try {
      const methods = await mpRef.current.getPaymentMethods({ bin });
      const pm = methods.results?.[0];
      if (pm) setPaymentMethodId(pm.id);
      const inst = await mpRef.current.getInstallments({ amount: total.toFixed(2), bin, paymentTypeId: "credit_card" });
      const costs = inst?.[0]?.payer_costs ?? [];
      // Limita a 12x. O comprador paga os juros (financiamento do MP);
      // o vendedor recebe o valor base do produto.
      setInstallmentOptions(
        costs
          .filter((c) => c.installments <= 12)
          .map((c) => ({
            installments: c.installments,
            label: c.recommended_message,
            totalAmount: c.total_amount,
            hasInterest: c.installment_rate > 0,
          }))
      );
    } catch {
      // silencioso — usuário ainda pode tentar enviar
    }
  }

  function pollStatus(orderId: string) {
    setPendingOrderId(orderId);
    const started = Date.now();
    const timer = setInterval(async () => {
      if (Date.now() - started > 1000 * 60 * 15) { clearInterval(timer); return; } // desiste após 15min
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

  async function handlePayCard() {
    if (!mpRef.current) { setSubmitError("Aguarde o carregamento do formulário."); return; }
    if (!card.number || !card.name || !card.month || !card.year || !card.cvv || !card.cpf) {
      setSubmitError("Preencha todos os dados do cartão.");
      return;
    }
    setLoading(true);
    setSubmitError(null);
    try {
      const token = await mpRef.current.createCardToken({
        cardNumber: onlyDigits(card.number),
        cardholderName: card.name,
        cardExpirationMonth: card.month.padStart(2, "0"),
        cardExpirationYear: card.year.length === 2 ? `20${card.year}` : card.year,
        securityCode: card.cvv,
        identificationType: "CPF",
        identificationNumber: onlyDigits(card.cpf),
      });

      const res = await fetch("/api/checkout/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          couponCode,
          method: "card",
          token: token.id,
          installments,
          paymentMethodId: paymentMethodId ?? "visa",
          payer: { email: payerEmail, identificationType: "CPF", identificationNumber: onlyDigits(card.cpf) },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao processar pagamento.");

      if (data.status === "processed") {
        window.location.href = `/checkout/success?order_id=${data.orderId}`;
      } else if (["failed", "cancelled"].includes(data.status)) {
        setSubmitError("Pagamento não aprovado. Verifique os dados do cartão ou tente outro.");
      } else {
        // em processamento — acompanha
        pollStatus(data.orderId);
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Erro ao processar o cartão.");
    } finally {
      setLoading(false);
    }
  }

  async function handlePayPixOrBoleto(m: "pix" | "boleto") {
    if (!payer.cpf || !payer.firstName) { setSubmitError("Preencha nome e CPF."); return; }
    setLoading(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/checkout/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          couponCode,
          method: m,
          payer: { email: payerEmail, firstName: payer.firstName, lastName: payer.lastName, identificationType: "CPF", identificationNumber: onlyDigits(payer.cpf) },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao gerar pagamento.");

      if (m === "pix" && data.pix) setPixResult(data.pix);
      if (m === "boleto" && data.boleto) setBoletoResult(data.boleto);
      pollStatus(data.orderId);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Erro ao gerar pagamento.");
    } finally {
      setLoading(false);
    }
  }

  const tabs: { id: Method; label: string; icon: React.ReactNode }[] = [
    { id: "card", label: "Cartão", icon: <CreditCard className="h-4 w-4" /> },
    { id: "pix", label: "PIX", icon: <QrCode className="h-4 w-4" /> },
    { id: "boleto", label: "Boleto", icon: <FileText className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Script src="https://sdk.mercadopago.com/js/v2" onReady={() => setSdkReady(true)} />

      <div className="border-b border-border bg-card px-4 py-3 flex items-center justify-between">
        <Image src="/logo.png" alt="LEX Concursos" width={38} height={32} className="object-contain" />
        <div className="flex items-center gap-1.5 text-xs text-foreground-muted">
          <Lock className="h-3 w-3 text-success" /><span>Compra 100% segura</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3 space-y-6">
          <div className="space-y-3">
            <BackButton fallbackHref={`/course?productId=${product.id}`} label="Voltar para o curso" />
            <h1 className="text-xl font-semibold text-foreground">Finalizar compra</h1>
          </div>

          {!mpPublicKey ? (
            <div className="flex items-start gap-3 rounded-md border border-warning/40 bg-warning-muted/30 p-4 text-sm">
              <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">Pagamento ainda não configurado.</p>
                <p className="text-foreground-muted text-xs mt-1">Defina as variáveis do Mercado Pago no ambiente.</p>
              </div>
            </div>
          ) : pixResult ? (
            <PixDisplay pix={pixResult} onCopy={() => { navigator.clipboard.writeText(pixResult.qrCode); success("Código PIX copiado!"); }} />
          ) : boletoResult ? (
            <BoletoDisplay boleto={boletoResult} onCopy={() => { boletoResult.digitableLine && navigator.clipboard.writeText(boletoResult.digitableLine); success("Linha digitável copiada!"); }} />
          ) : (
            <section className="space-y-4 rounded-lg border border-border bg-card p-5">
              <div className="grid grid-cols-3 gap-2">
                {tabs.map((t) => (
                  <button key={t.id} onClick={() => { setMethod(t.id); setSubmitError(null); }}
                    className={cn("flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 text-xs font-medium transition-all", method === t.id ? "border-primary bg-primary/5 text-primary" : "border-border text-foreground-muted hover:border-primary/40")}>
                    {t.icon}{t.label}
                  </button>
                ))}
              </div>

              {method === "card" && (
                <div className="space-y-3 pt-2">
                  <Input label="Número do cartão" placeholder="0000 0000 0000 0000" inputMode="numeric" maxLength={19} value={card.number}
                    onChange={(e) => setCard((c) => ({ ...c, number: formatCardNumber(e.target.value) }))}
                    onBlur={() => handleBinLookup(onlyDigits(card.number))} />
                  <Input label="Nome no cartão" placeholder="Como impresso no cartão" value={card.name} onChange={(e) => setCard((c) => ({ ...c, name: e.target.value }))} />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Validade"
                      placeholder="MM/AA"
                      inputMode="numeric"
                      maxLength={5}
                      value={card.year ? `${card.month}/${card.year}` : card.month}
                      onChange={(e) => {
                        const d = onlyDigits(e.target.value).slice(0, 4); // MMAA
                        let mm = d.slice(0, 2);
                        const yy = d.slice(2, 4);
                        if (mm.length === 2 && Number(mm) > 12) mm = "12";
                        setCard((c) => ({ ...c, month: mm, year: yy }));
                      }}
                    />
                    <Input label="CVV" placeholder="123" inputMode="numeric" maxLength={4} value={card.cvv} onChange={(e) => setCard((c) => ({ ...c, cvv: onlyDigits(e.target.value).slice(0, 4) }))} />
                  </div>
                  <Input label="CPF do titular" placeholder="000.000.000-00" inputMode="numeric" value={card.cpf} onChange={(e) => setCard((c) => ({ ...c, cpf: e.target.value }))} />
                  {installmentOptions.length > 0 && (
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">Parcelas (em até 12x)</label>
                      <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                        value={installments} onChange={(e) => setInstallments(Number(e.target.value))}>
                        {installmentOptions.map((o) => <option key={o.installments} value={o.installments}>{o.label}</option>)}
                      </select>
                      {selectedInst && selectedInst.installments > 1 && (
                        <p className="mt-1.5 text-xs text-foreground-muted">
                          Total no cartão: <strong className="text-foreground">{formatCurrency(selectedInst.totalAmount)}</strong>
                          {selectedInst.hasInterest ? " (com juros do cartão)" : " (sem juros)"}
                        </p>
                      )}
                    </div>
                  )}
                  <Button className="w-full" size="lg" loading={loading} onClick={handlePayCard}>
                    <Lock className="h-4 w-4 mr-1" /> Pagar {formatCurrency(chargeAmount)}
                  </Button>
                </div>
              )}

              {(method === "pix" || method === "boleto") && (
                <div className="space-y-3 pt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Nome" value={payer.firstName} onChange={(e) => setPayer((p) => ({ ...p, firstName: e.target.value }))} />
                    <Input label="Sobrenome" value={payer.lastName} onChange={(e) => setPayer((p) => ({ ...p, lastName: e.target.value }))} />
                  </div>
                  <Input label="CPF" placeholder="000.000.000-00" inputMode="numeric" value={payer.cpf} onChange={(e) => setPayer((p) => ({ ...p, cpf: e.target.value }))} />
                  <p className="text-xs text-foreground-muted">
                    {method === "pix" ? "Geramos um QR Code PIX. A liberação é instantânea após o pagamento." : "Geramos um boleto. A compensação leva até 3 dias úteis."}
                  </p>
                  <Button className="w-full" size="lg" loading={loading} onClick={() => handlePayPixOrBoleto(method)}>
                    {method === "pix" ? "Gerar PIX" : "Gerar Boleto"}
                  </Button>
                </div>
              )}

              {submitError && <p className="text-sm text-destructive">{submitError}</p>}
            </section>
          )}

          {pendingOrderId && (pixResult || boletoResult) && (
            <div className="flex items-center gap-2 text-sm text-foreground-muted">
              <Loader2 className="h-4 w-4 animate-spin" /> Aguardando confirmação do pagamento...
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <img src={product.thumbnail} className="w-full aspect-video object-cover" alt={product.title} />
            <div className="p-4 space-y-2">
              <p className="text-sm font-semibold text-foreground">{product.title}</p>
              <div className="flex items-center gap-1 text-xs text-foreground-muted">
                {product.rating > 0 && <span>★ {product.rating.toFixed(1)}</span>}
                <span>{product.enrolledCount} alunos</span>
              </div>
              <Badge variant="success">Acesso vitalício</Badge>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <p className="text-sm font-semibold text-foreground flex items-center gap-2"><Tag className="h-4 w-4" /> Cupom de desconto</p>
            <div className="flex gap-2">
              <Input placeholder="SEUCODIGO" value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} className="flex-1" />
              <Button size="sm" variant="outline" onClick={handleApplyCoupon} loading={couponLoading}>Aplicar</Button>
            </div>
            {couponCode && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-success font-medium">✓ {couponCode}</span>
                <button onClick={() => { setCouponCode(null); setDiscount(0); setCoupon(""); }} className="text-foreground-muted hover:text-destructive transition-colors">Remover</button>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-foreground-muted">{product.title}</span>
              <span className="text-foreground">{formatCurrency(product.price)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-success">Desconto ({couponCode})</span>
                <span className="text-success">-{formatCurrency(discount)}</span>
              </div>
            )}
            <div className="border-t border-border pt-3 flex justify-between font-semibold">
              <span className="text-foreground">Total</span>
              <span className="text-foreground text-lg">{formatCurrency(total)}</span>
            </div>
          </div>

          <p className="text-center text-xs text-foreground-muted">Ao concluir, você concorda com os Termos de Uso.</p>
        </div>
      </div>
    </div>
  );
}

function PixDisplay({ pix, onCopy }: { pix: PixResult; onCopy: () => void }) {
  return (
    <section className="space-y-4 rounded-lg border border-border bg-card p-5 text-center">
      <h2 className="text-sm font-semibold text-foreground">Pague com PIX</h2>
      {pix.qrCodeBase64 && <img src={`data:image/png;base64,${pix.qrCodeBase64}`} alt="QR Code PIX" className="mx-auto h-56 w-56 rounded-lg border border-border" />}
      <p className="text-xs text-foreground-muted">Abra o app do seu banco, escaneie o QR Code ou copie o código abaixo.</p>
      <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2">
        <code className="flex-1 truncate text-xs font-mono text-foreground">{pix.qrCode}</code>
        <button onClick={onCopy} className="text-foreground-muted hover:text-foreground shrink-0"><Copy className="h-4 w-4" /></button>
      </div>
      <Badge variant="success" dot>Liberação instantânea após o pagamento</Badge>
    </section>
  );
}

function BoletoDisplay({ boleto, onCopy }: { boleto: BoletoResult; onCopy: () => void }) {
  return (
    <section className="space-y-4 rounded-lg border border-border bg-card p-5 text-center">
      <h2 className="text-sm font-semibold text-foreground">Boleto gerado</h2>
      <a href={boleto.url} target="_blank" rel="noopener noreferrer" className="inline-block">
        <Button size="lg" leftIcon={<ExternalLink className="h-4 w-4" />}>Abrir / imprimir boleto</Button>
      </a>
      {boleto.digitableLine && (
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2">
          <code className="flex-1 truncate text-xs font-mono text-foreground">{boleto.digitableLine}</code>
          <button onClick={onCopy} className="text-foreground-muted hover:text-foreground shrink-0"><Copy className="h-4 w-4" /></button>
        </div>
      )}
      <p className="text-xs text-foreground-muted">A compensação leva até 3 dias úteis. Seu acesso é liberado automaticamente após o pagamento.</p>
    </section>
  );
}
