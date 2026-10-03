"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { createCoupon } from "@/lib/actions/finance";

const EMPTY = { code: "", type: "percentage" as "percentage" | "fixed", value: "", maxUses: "", expiresAt: "", minOrderValue: "" };
const num = (v: string) => Number(v.replace(/\./g, "").replace(",", "."));

// Financeiro › Cupons › "+ Novo cupom". O checkout já aplica e valida o cupom.
export function NewCouponDialog() {
  const { success, error } = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const set = (patch: Partial<typeof EMPTY>) => setForm((f) => ({ ...f, ...patch }));

  async function save() {
    setSaving(true);
    const res = await createCoupon({
      code: form.code,
      type: form.type,
      value: num(form.value),
      maxUses: form.maxUses ? Number(form.maxUses) : null,
      expiresAt: form.expiresAt || null,
      minOrderValue: form.minOrderValue ? num(form.minOrderValue) : null,
    });
    setSaving(false);
    if (!res.success) { error(res.error); return; }
    success(`Cupom ${form.code.trim().toUpperCase()} criado.`);
    setForm(EMPTY);
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>Novo cupom</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Novo cupom" description="O aluno digita o código no checkout e o desconto é aplicado na hora.">
        <div className="space-y-4">
          <Input label="Código" placeholder="LEX10" value={form.code} onChange={(e) => set({ code: e.target.value.toUpperCase().replace(/\s/g, "") })} autoFocus />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Tipo" value={form.type} onChange={(e) => set({ type: e.target.value as "percentage" | "fixed" })}
              options={[{ value: "percentage", label: "Percentual (%)" }, { value: "fixed", label: "Valor fixo (R$)" }]} />
            <Input label={form.type === "percentage" ? "Desconto (%)" : "Desconto (R$)"} inputMode="decimal" placeholder={form.type === "percentage" ? "10" : "50,00"}
              value={form.value} onChange={(e) => set({ value: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Limite de usos (opcional)" type="number" min="1" placeholder="sem limite" value={form.maxUses} onChange={(e) => set({ maxUses: e.target.value })} />
            <Input label="Válido até (opcional)" type="date" value={form.expiresAt} onChange={(e) => set({ expiresAt: e.target.value })} />
          </div>
          <Input label="Valor mínimo do pedido em R$ (opcional)" inputMode="decimal" placeholder="sem mínimo" value={form.minOrderValue} onChange={(e) => set({ minOrderValue: e.target.value })} />
          <p className="text-xs text-foreground-muted">Cupom de 100% libera o curso na hora, sem pagamento (útil para cortesias).</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={save} loading={saving} disabled={!form.code || !form.value}>Criar cupom</Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
