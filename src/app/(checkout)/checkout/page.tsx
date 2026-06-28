"use client";
import { useState } from "react";
import { CreditCard, QrCode, FileText, Lock, Check, ChevronDown, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { MOCK_PRODUCTS, MOCK_COUPONS } from "@/lib/mock/data";
import { formatCurrency } from "@/lib/utils/cn";
import { cn } from "@/lib/utils/cn";

type PaymentMethod = "pix" | "credit_card" | "boleto";

export default function CheckoutPage() {
  const { success, error } = useToast();
  const product = MOCK_PRODUCTS[0];
  const [method, setMethod] = useState<PaymentMethod>("credit_card");
  const [coupon, setCoupon] = useState("");
  const [couponApplied, setCouponApplied] = useState<typeof MOCK_COUPONS[0] | null>(null);
  const [loading, setLoading] = useState(false);
  const [installments, setInstallments] = useState("1");
  const [orderBump, setOrderBump] = useState(false);

  const basePrice = product.price;
  const orderBumpPrice = 97;
  const discountAmount = couponApplied
    ? couponApplied.type === "percentage"
      ? (basePrice * couponApplied.value) / 100
      : couponApplied.value
    : 0;
  const subtotal = basePrice + (orderBump ? orderBumpPrice : 0);
  const total = Math.max(0, subtotal - discountAmount);

  async function applyCoupon() {
    const found = MOCK_COUPONS.find((c) => c.code === coupon.toUpperCase() && c.isActive);
    if (found) { setCouponApplied(found); success(`Cupom "${found.code}" aplicado!`); }
    else error("Cupom inválido ou expirado.");
  }

  async function handlePay() {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1500));
    window.location.href = "/checkout/success";
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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
        {/* Left — form */}
        <div className="lg:col-span-3 space-y-6">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Finalizar compra</h1>
          </div>

          {/* Personal info */}
          <section className="space-y-4 rounded-lg border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground">Dados pessoais</h2>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Nome" placeholder="Seu nome" />
              <Input label="Sobrenome" placeholder="Seu sobrenome" />
            </div>
            <Input label="Email" type="email" placeholder="voce@email.com" />
            <Input label="CPF" placeholder="000.000.000-00" />
          </section>

          {/* Payment method */}
          <section className="space-y-4 rounded-lg border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground">Forma de pagamento</h2>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "credit_card" as PaymentMethod, label: "Cartão", icon: <CreditCard className="h-4 w-4" /> },
                { id: "pix" as PaymentMethod, label: "PIX", icon: <QrCode className="h-4 w-4" /> },
                { id: "boleto" as PaymentMethod, label: "Boleto", icon: <FileText className="h-4 w-4" /> },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMethod(m.id)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-lg border-2 p-3 text-xs font-medium transition-all",
                    method === m.id ? "border-primary bg-primary/5 text-primary" : "border-border text-foreground-muted hover:border-primary/40"
                  )}
                >
                  {m.icon}
                  {m.label}
                  {method === m.id && <Check className="h-3 w-3 text-primary" />}
                </button>
              ))}
            </div>

            {method === "credit_card" && (
              <div className="space-y-3 pt-2 border-t border-border">
                <Input label="Número do cartão" placeholder="0000 0000 0000 0000" />
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Validade" placeholder="MM/AA" />
                  <Input label="CVV" placeholder="123" />
                </div>
                <Input label="Nome no cartão" placeholder="Nome como no cartão" />
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                  value={installments}
                  onChange={(e) => setInstallments(e.target.value)}
                >
                  {[1,2,3,6,12].map((n) => (
                    <option key={n} value={n}>
                      {n}x de {formatCurrency(total / n)} {n === 1 ? "(sem juros)" : "(sem juros)"}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {method === "pix" && (
              <div className="pt-2 border-t border-border text-center space-y-3">
                <div className="mx-auto h-32 w-32 bg-muted rounded-lg flex items-center justify-center border border-border">
                  <QrCode className="h-16 w-16 text-foreground-muted" />
                </div>
                <p className="text-xs text-foreground-muted">O QR Code será gerado após confirmar o pedido.</p>
                <Badge variant="success" dot>Aprovação instantânea</Badge>
              </div>
            )}

            {method === "boleto" && (
              <div className="pt-2 border-t border-border space-y-2">
                <p className="text-xs text-foreground-muted">O boleto será gerado e enviado por email. Prazo de vencimento: <strong>3 dias úteis</strong>.</p>
                <Badge variant="warning">Aprovação em até 3 dias úteis</Badge>
              </div>
            )}
          </section>

          {/* Order bump */}
          <section className="rounded-lg border-2 border-dashed border-warning/60 bg-warning-muted/30 p-4">
            <div className="flex items-start gap-3">
              <Switch checked={orderBump} onChange={setOrderBump} size="sm" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">🎁 Oferta especial — adicione ao pedido</p>
                <p className="text-xs text-foreground-muted mt-0.5">Assinatura Premium por apenas <strong>{formatCurrency(orderBumpPrice)}/mês</strong> — acesso a todos os cursos.</p>
              </div>
            </div>
          </section>
        </div>

        {/* Right — summary */}
        <div className="lg:col-span-2 space-y-4">
          {/* Product */}
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <img src={product.thumbnail} className="w-full aspect-video object-cover" alt={product.title} />
            <div className="p-4 space-y-2">
              <p className="text-sm font-semibold text-foreground">{product.title}</p>
              <div className="flex items-center gap-1 text-xs text-foreground-muted">
                <span>★ {product.rating}</span>
                <span>({product.reviewCount} avaliações)</span>
                <span>·</span>
                <span>{product.enrolledCount} alunos</span>
              </div>
              <Badge variant="success">Acesso vitalício</Badge>
            </div>
          </div>

          {/* Coupon */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <p className="text-sm font-semibold text-foreground flex items-center gap-2"><Tag className="h-4 w-4" /> Cupom de desconto</p>
            <div className="flex gap-2">
              <Input placeholder="SEUCODIGO" value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} className="flex-1" />
              <Button size="sm" variant="outline" onClick={applyCoupon}>Aplicar</Button>
            </div>
            {couponApplied && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-success font-medium">✓ {couponApplied.code}</span>
                <button onClick={() => { setCouponApplied(null); setCoupon(""); }} className="text-foreground-muted hover:text-destructive transition-colors">Remover</button>
              </div>
            )}
            <p className="text-2xs text-foreground-subtle">Teste: PROMO20 (20% off)</p>
          </div>

          {/* Price summary */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-foreground-muted">{product.title}</span>
              <span className="text-foreground">{formatCurrency(basePrice)}</span>
            </div>
            {orderBump && (
              <div className="flex justify-between text-sm">
                <span className="text-foreground-muted">Assinatura Premium</span>
                <span className="text-foreground">{formatCurrency(orderBumpPrice)}</span>
              </div>
            )}
            {discountAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-success">Desconto ({couponApplied?.code})</span>
                <span className="text-success">-{formatCurrency(discountAmount)}</span>
              </div>
            )}
            <div className="border-t border-border pt-3 flex justify-between font-semibold">
              <span className="text-foreground">Total</span>
              <span className="text-foreground text-lg">{formatCurrency(total)}</span>
            </div>
          </div>

          <Button className="w-full" size="lg" loading={loading} onClick={handlePay}>
            <Lock className="h-4 w-4 mr-1" />
            {method === "pix" ? "Gerar PIX" : method === "boleto" ? "Gerar Boleto" : "Pagar agora"}
          </Button>

          <p className="text-center text-xs text-foreground-muted">
            Ao concluir, você concorda com os Termos de Uso. Garantia de 7 dias ou seu dinheiro de volta.
          </p>
        </div>
      </div>
    </div>
  );
}
