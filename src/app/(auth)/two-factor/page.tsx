"use client";
import { useRef, useState } from "react";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export default function TwoFactorPage() {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  function handleChange(val: string, i: number) {
    if (!/^\d*$/.test(val)) return;
    const next = [...code];
    next[i] = val.slice(-1);
    setCode(next);
    if (val && i < 5) inputs.current[i + 1]?.focus();
  }

  function handleKey(e: React.KeyboardEvent, i: number) {
    if (e.key === "Backspace" && !code[i] && i > 0) inputs.current[i - 1]?.focus();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const full = code.join("");
    if (full.length < 6) { error("Digite o código completo."); return; }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    if (full === "123456") { success("Autenticação confirmada!"); window.location.href = "/admin/dashboard"; }
    else { error("Código inválido. Tente novamente."); setCode(["","","","","",""]); inputs.current[0]?.focus(); }
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Verificação em 2 etapas</h1>
          <p className="mt-1 text-sm text-foreground-muted">Digite o código de 6 dígitos do seu aplicativo autenticador.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex justify-center gap-2">
          {code.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(e.target.value, i)}
              onKeyDown={(e) => handleKey(e, i)}
              className="h-12 w-10 rounded-lg border border-input bg-background text-center text-lg font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-all"
            />
          ))}
        </div>

        <Button type="submit" className="w-full" size="lg" loading={loading}>
          Verificar código
        </Button>
      </form>

      <p className="text-center text-xs text-foreground-muted">
        Código demo: <strong className="text-foreground">123456</strong>
      </p>
    </div>
  );
}
