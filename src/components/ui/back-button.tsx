"use client";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils/cn";

// Botão "Voltar" que usa o histórico do navegador; se não houver histórico
// (ex: link direto), cai para uma rota de fallback.
export function BackButton({ fallbackHref = "/", label = "Voltar", className = "" }: { fallbackHref?: string; label?: string; className?: string }) {
  const router = useRouter();

  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      className={cn("inline-flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground transition-colors", className)}
    >
      <ArrowLeft className="h-4 w-4" /> {label}
    </button>
  );
}
