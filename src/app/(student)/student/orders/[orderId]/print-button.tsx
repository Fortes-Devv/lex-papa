"use client";
import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong bg-card px-3.5 text-[13px] font-semibold text-foreground dark:border-white/10">
      <Printer className="h-4 w-4" /> Imprimir / salvar PDF
    </button>
  );
}
