"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils/cn";

// Botão que chama uma server action, mostra o resultado e atualiza a página.
export function ActionButton({ action, confirmText, okText, children, variant = "dark", className }: {
  action: () => Promise<{ success: boolean; error?: string; message?: string }>;
  confirmText?: string;
  okText?: string; // padrão: a mensagem que a action devolver
  children: React.ReactNode;
  variant?: "dark" | "primary" | "ghost";
  className?: string;
}) {
  const { success, error } = useToast();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const styles = { dark: "bg-navy text-white hover:bg-navy-deep", primary: "bg-brand text-white hover:bg-brand-dark", ghost: "border border-line-strong bg-card text-foreground hover:bg-background dark:border-white/10" }[variant];
  return (
    <button type="button" disabled={busy}
      onClick={async () => {
        if (confirmText && !confirm(confirmText)) return;
        setBusy(true);
        const result = await action();
        setBusy(false);
        if (!result.success) { error(result.error ?? "Não foi possível concluir."); return; }
        success(result.message ?? okText ?? "Feito.");
        router.refresh();
      }}
      className={cn("inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-3.5 text-[13px] font-semibold transition-colors disabled:opacity-60", styles, className)}>
      {busy ? "Processando…" : children}
    </button>
  );
}
