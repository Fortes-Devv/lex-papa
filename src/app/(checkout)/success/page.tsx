"use client";
import Link from "next/link";
import { CheckCircle2, BookOpen, ArrowRight, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MOCK_PRODUCTS } from "@/lib/mock/data";
import { formatCurrency } from "@/lib/utils/cn";

export default function CheckoutSuccessPage() {
  const product = MOCK_PRODUCTS[0];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="mx-auto h-20 w-20 rounded-full bg-success/10 flex items-center justify-center">
          <CheckCircle2 className="h-10 w-10 text-success" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Pagamento confirmado!</h1>
          <p className="text-foreground-muted text-sm">Sua compra de <strong>{product.title}</strong> foi processada com sucesso.</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 text-left space-y-3">
          <div className="flex items-center gap-3">
            <img src={product.thumbnail} className="h-12 w-20 rounded object-cover" alt={product.title} />
            <div>
              <p className="text-sm font-semibold text-foreground">{product.title}</p>
              <p className="text-xs text-foreground-muted">{formatCurrency(product.price)} · Acesso vitalício</p>
            </div>
          </div>
          <p className="text-xs text-foreground-muted">Um email de confirmação foi enviado para você. Guarde o número do pedido: <strong className="font-mono text-foreground">ORD-2026-00042</strong></p>
        </div>

        <div className="flex flex-col gap-3">
          <Link href="/student/dashboard">
            <Button className="w-full" size="lg" rightIcon={<ArrowRight className="h-4 w-4" />}>
              <BookOpen className="h-4 w-4" />
              Começar a aprender
            </Button>
          </Link>
          <Button variant="outline" className="w-full" leftIcon={<Share2 className="h-4 w-4" />}>
            Compartilhar conquista
          </Button>
        </div>

        <p className="text-xs text-foreground-muted">
          Dúvidas?{" "}
          <a href="mailto:suporte@lexconcursos.com" className="text-primary hover:underline">suporte@lexconcursos.com</a>
        </p>
      </div>
    </div>
  );
}
