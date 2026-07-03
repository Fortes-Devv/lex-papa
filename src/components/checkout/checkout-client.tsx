"use client";
import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { Lock, Tag, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { formatCurrency } from "@/lib/utils/cn";
import { applyCoupon } from "@/lib/actions/checkout";

declare global {
  interface Window {
    MercadoPago?: new (publicKey: string, opts?: { locale?: string }) => {
      bricks: () => {
        create: (type: string, containerId: string, settings: Record<string, unknown>) => Promise<{ unmount: () => void }>;
      };
    };
  }
}

interface CheckoutClientProps {
  product: {
    id: string;
    title: string;
    thumbnail: string;
    price: number;
    rating: number;
    reviewCount: number;
    enrolledCount: number;
  };
  payerEmail: string;
  payerName: string;
  mpPublicKey: string;
}

export function CheckoutClient({ product, payerEmail, payerName, mpPublicKey }: CheckoutClientProps) {
  const { error: toastError } = useToast();
  const [sdkReady, setSdkReady] = useState(false);
  const [coupon, setCoupon] = useState("");
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [discount, setDiscount] = useState(0);
  const [couponLoading, setCouponLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const brickRef = useRef<{ unmount: () => void } | null>(null);

  const total = Math.max(product.price - discount, 0);

  async function handleApplyCoupon() {
    if (!coupon) return;
    setCouponLoading(true);
    const result = await applyCoupon(product.id, coupon);
    setCouponLoading(false);
    if (!result.success) {
      toastError(result.error);
      return;
    }
    setCouponCode(result.couponCode);
    setDiscount(result.discount);
  }

  useEffect(() => {
    if (!sdkReady || !mpPublicKey || !window.MercadoPago) return;

    let cancelled = false;
    const mp = new window.MercadoPago(mpPublicKey, { locale: "pt-BR" });

    brickRef.current?.unmount();

    mp.bricks()
      .create("payment", "checkout-brick-container", {
        initialization: {
          amount: total,
          payer: { email: payerEmail },
        },
        customization: {
          paymentMethods: {
            creditCard: "all",
            debitCard: "all",
            ticket: "all",
            bankTransfer: "all",
          },
        },
        callbacks: {
          onReady: () => {},
          onError: () => setSubmitError("Erro ao carregar o formulário de pagamento."),
          onSubmit: ({ formData }: { formData: Record<string, unknown> }) => {
            setSubmitError(null);
            return new Promise<void>((resolve, reject) => {
              fetch("/api/checkout/process-payment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ productId: product.id, couponCode, formData }),
              })
                .then(async (res) => {
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.error ?? "Erro ao processar pagamento.");
                  resolve();
                  window.location.href = `/checkout/success?order_id=${data.orderId}`;
                })
                .catch((err) => {
                  setSubmitError(err instanceof Error ? err.message : "Erro ao processar pagamento.");
                  reject(err);
                });
            });
          },
        },
      })
      .then((controller) => {
        if (cancelled) controller.unmount();
        else brickRef.current = controller;
      });

    return () => {
      cancelled = true;
      brickRef.current?.unmount();
      brickRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sdkReady, total]);

  return (
    <div className="min-h-screen bg-background">
      <Script src="https://sdk.mercadopago.com/js/v2" onReady={() => setSdkReady(true)} />

      <div className="border-b border-border bg-card px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded bg-primary flex items-center justify-center"><span className="text-white font-bold text-xs">E</span></div>
          <span className="font-semibold text-sm text-foreground">LEX Concursos</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-foreground-muted">
          <Lock className="h-3 w-3 text-success" />
          <span>Compra 100% segura</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3 space-y-6">
          <h1 className="text-xl font-semibold text-foreground">Finalizar compra</h1>

          <section className="space-y-4 rounded-lg border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground">Pagamento</h2>

            {!mpPublicKey ? (
              <div className="flex items-start gap-3 rounded-md border border-warning/40 bg-warning-muted/30 p-4 text-sm text-foreground">
                <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Pagamento ainda não configurado.</p>
                  <p className="text-foreground-muted text-xs mt-1">
                    Defina <code>NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY</code> e <code>MERCADOPAGO_ACCESS_TOKEN</code> no .env para ativar o checkout.
                  </p>
                </div>
              </div>
            ) : (
              <div id="checkout-brick-container" />
            )}

            {submitError && <p className="text-sm text-destructive">{submitError}</p>}
          </section>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <img src={product.thumbnail} className="w-full aspect-video object-cover" alt={product.title} />
            <div className="p-4 space-y-2">
              <p className="text-sm font-semibold text-foreground">{product.title}</p>
              <div className="flex items-center gap-1 text-xs text-foreground-muted">
                {product.rating > 0 && <span>★ {product.rating.toFixed(1)}</span>}
                {product.reviewCount > 0 && <span>({product.reviewCount} avaliações)</span>}
                <span>·</span>
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

          <p className="text-center text-xs text-foreground-muted">
            Ao concluir, você concorda com os Termos de Uso.
          </p>
        </div>
      </div>
    </div>
  );
}
