"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy } from "lucide-react";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { Select } from "@/components/ui/select";
import { setTemporaryPassword, transferPurchases, updateUserByAdmin } from "@/lib/actions/users";

export type SupportAction = { kind: "password" | "transfer" | "edit"; userId: string; name: string; email: string; phone?: string; status?: string } | null;

// Suporte ao aluno: senha temporária e mover compras para a conta certa.
export function SupportDialogs({ action, onClose }: { action: SupportAction; onClose: () => void }) {
  const { success, error } = useToast();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState<string | null>(null);
  const [toEmail, setToEmail] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "", status: "active" });
  useEffect(() => {
    setPassword(null);
    setToEmail("");
    if (action) setForm({ name: action.name, email: action.email, phone: action.phone ?? "", status: action.status ?? "active" });
  }, [action]);

  async function saveEdit() {
    if (!action) return;
    setBusy(true);
    const res = await updateUserByAdmin(action.userId, { ...form, status: form.status as "active" });
    setBusy(false);
    if (!res.success) { error(res.error); return; }
    success("Dados atualizados.");
    onClose();
    router.refresh();
  }

  async function generate() {
    if (!action) return;
    setBusy(true);
    const res = await setTemporaryPassword(action.userId);
    setBusy(false);
    if (!res.success) { error(res.error); return; }
    setPassword(res.tempPassword);
  }

  async function transfer() {
    if (!action) return;
    setBusy(true);
    const res = await transferPurchases(action.userId, toEmail);
    setBusy(false);
    if (!res.success) { error(res.error); return; }
    success(res.message);
    onClose();
    router.refresh();
  }

  return (
    <>
      <Dialog open={action?.kind === "edit"} onClose={onClose} title="Editar dados" description="Corrija nome, e-mail, telefone ou bloqueie a conta. O e-mail é o login do aluno.">
        <div className="space-y-4">
          <Input label="Nome" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <Input label="E-mail (login)" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          <Input label="WhatsApp / telefone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          <Select label="Situação" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            options={[{ value: "active", label: "Ativa" }, { value: "inactive", label: "Inativa" }, { value: "banned", label: "Bloqueada" }]} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={saveEdit} loading={busy} disabled={form.name.trim().length < 2 || !form.email.includes("@")}>Salvar</Button>
        </DialogFooter>
      </Dialog>

      <Dialog open={action?.kind === "password"} onClose={onClose} title="Senha temporária"
        description={action ? `Gera uma senha nova para ${action.name} (${action.email}). A senha antiga deixa de funcionar.` : ""}>
        {password ? (
          <div className="space-y-3">
            <p className="text-sm text-foreground-muted">Envie para o aluno (ex.: WhatsApp). Ela só aparece agora:</p>
            <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2">
              <code className="flex-1 font-mono text-base text-foreground">{password}</code>
              <button type="button" aria-label="Copiar senha" onClick={() => { navigator.clipboard.writeText(password); success("Senha copiada."); }} className="text-foreground-muted hover:text-foreground"><Copy className="h-4 w-4" /></button>
            </div>
            <p className="text-xs text-foreground-muted">Depois de entrar, o aluno pode trocar em Perfil › Senha e segurança.</p>
          </div>
        ) : (
          <p className="text-sm text-foreground-muted">Use quando o aluno não consegue entrar e o e-mail de redefinição não resolveu (às vezes ele cai no Spam ou em Promoções).</p>
        )}
        <DialogFooter>
          {password ? <Button onClick={onClose}>Concluir</Button> : (
            <>
              <Button variant="outline" onClick={onClose}>Cancelar</Button>
              <Button onClick={generate} loading={busy}>Gerar senha</Button>
            </>
          )}
        </DialogFooter>
      </Dialog>

      <Dialog open={action?.kind === "transfer"} onClose={onClose} title="Mover cursos para outra conta"
        description={action ? `Os cursos e pedidos de ${action.name} (${action.email}) vão para a conta com o e-mail abaixo. Útil quando o aluno comprou numa conta criada com e-mail errado.` : ""}>
        <Input label="E-mail da conta certa" type="email" placeholder="aluno@gmail.com" value={toEmail} onChange={(e) => setToEmail(e.target.value)} autoFocus />
        <p className="mt-2 text-xs text-foreground-muted">Depois, se quiser, exclua a conta errada (fica sem compras).</p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={transfer} loading={busy} disabled={!toEmail.includes("@")}>Mover</Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
