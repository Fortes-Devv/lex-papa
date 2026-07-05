"use client";
import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, MoreHorizontal, Shield, Ban, CheckCircle2, UserCog, Copy, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dropdown } from "@/components/ui/dropdown";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { formatRelativeDate } from "@/lib/utils/cn";
import { createUserByAdmin, updateUserRole, updateUserStatus, updateUserEmail } from "@/lib/actions/users";
import type { User, UserRole, UserStatus } from "@/lib/types";

const roleLabels: Record<UserRole, string> = { admin: "Admin", teacher: "Professor", student: "Aluno", moderator: "Moderador" };
const roleVariants: Record<UserRole, "default" | "success" | "secondary" | "warning"> = {
  admin: "default", teacher: "success", student: "secondary", moderator: "warning"
};
const statusVariants: Record<UserStatus, "success" | "secondary" | "destructive" | "warning"> = {
  active: "success", inactive: "secondary", banned: "destructive", pending: "warning"
};
const statusLabels: Record<UserStatus, string> = { active: "Ativo", inactive: "Inativo", banned: "Banido", pending: "Pendente" };

export function UsersClient({ initialUsers }: { initialUsers: User[] }) {
  const { success, error } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<{ name: string; email: string; role: UserRole }>({ name: "", email: "", role: "student" });
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);

  const [emailUser, setEmailUser] = useState<User | null>(null);
  const [newEmail, setNewEmail] = useState("");

  const users = useMemo(() => {
    return initialUsers.filter((u) => {
      const matchSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
      const matchRole = !roleFilter || u.role === roleFilter;
      const matchStatus = !statusFilter || u.status === statusFilter;
      return matchSearch && matchRole && matchStatus;
    });
  }, [initialUsers, search, roleFilter, statusFilter]);

  async function handleCreate() {
    if (!createForm.name || !createForm.email) {
      error("Preencha nome e email.");
      return;
    }
    const result = await createUserByAdmin(createForm);
    if (!result.success) {
      error(result.error);
      return;
    }
    setGeneratedPassword(result.tempPassword);
    success(`Usuário ${createForm.name} criado.`);
    startTransition(() => router.refresh());
  }

  function closeCreateDialog() {
    setCreateOpen(false);
    setCreateForm({ name: "", email: "", role: "student" });
    setGeneratedPassword(null);
  }

  async function handleRoleChange(user: User, role: UserRole) {
    const result = await updateUserRole(user.id, role);
    if (!result.success) { error(result.error); return; }
    success(`Papel de ${user.name} alterado para ${roleLabels[role]}.`);
    startTransition(() => router.refresh());
  }

  async function handleStatusChange(user: User, status: UserStatus) {
    const result = await updateUserStatus(user.id, status);
    if (!result.success) { error(result.error); return; }
    success(`${user.name} agora está ${statusLabels[status].toLowerCase()}.`);
    startTransition(() => router.refresh());
  }

  function openEmailDialog(user: User) {
    setEmailUser(user);
    setNewEmail(user.email);
  }

  async function handleUpdateEmail() {
    if (!emailUser) return;
    const result = await updateUserEmail(emailUser.id, newEmail);
    if (!result.success) { error(result.error); return; }
    success(`Email de ${emailUser.name} atualizado.`);
    setEmailUser(null);
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Usuários</h1>
          <p className="text-sm text-foreground-muted mt-0.5">{initialUsers.length} usuários cadastrados</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>Criar usuário</Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px] max-w-xs">
          <Input placeholder="Buscar por nome ou email..." leftIcon={<Search className="h-4 w-4" />} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select
          options={[
            { value: "admin", label: "Admin" },
            { value: "teacher", label: "Professor" },
            { value: "student", label: "Aluno" },
          ]}
          placeholder="Papel"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="w-36"
        />
        <Select
          options={[
            { value: "active", label: "Ativo" },
            { value: "inactive", label: "Inativo" },
            { value: "banned", label: "Banido" },
          ]}
          placeholder="Status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-36"
        />
        {(roleFilter || statusFilter) && (
          <Button variant="ghost" size="sm" onClick={() => { setRoleFilter(""); setStatusFilter(""); }}>
            Limpar filtros
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>2FA</TableHead>
              <TableHead>Último acesso</TableHead>
              <TableHead>Membro desde</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar src={user.avatar} name={user.name} size="sm" />
                    <div>
                      <p className="font-medium text-foreground text-sm">{user.name}</p>
                      <p className="text-xs text-foreground-muted">{user.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={roleVariants[user.role]}>{roleLabels[user.role]}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariants[user.status]} dot>{statusLabels[user.status]}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={user.twoFactorEnabled ? "success" : "secondary"}>
                    {user.twoFactorEnabled ? "Ativo" : "Inativo"}
                  </Badge>
                </TableCell>
                <TableCell className="text-foreground-muted text-xs">
                  {user.lastLoginAt ? formatRelativeDate(user.lastLoginAt) : "Nunca"}
                </TableCell>
                <TableCell className="text-foreground-muted text-xs">
                  {formatRelativeDate(user.createdAt)}
                </TableCell>
                <TableCell>
                  <Dropdown
                    trigger={<Button variant="ghost" size="icon-sm" disabled={isPending}><MoreHorizontal className="h-4 w-4" /></Button>}
                    items={[
                      { label: "Tornar admin", icon: <Shield className="h-3.5 w-3.5" />, onClick: () => handleRoleChange(user, "admin") },
                      { label: "Tornar professor", icon: <UserCog className="h-3.5 w-3.5" />, onClick: () => handleRoleChange(user, "teacher") },
                      { label: "Tornar aluno", icon: <UserCog className="h-3.5 w-3.5" />, onClick: () => handleRoleChange(user, "student") },
                      { separator: true },
                      { label: "Alterar email", icon: <Mail className="h-3.5 w-3.5" />, onClick: () => openEmailDialog(user) },
                      { separator: true },
                      user.status === "banned"
                        ? { label: "Reativar usuário", icon: <CheckCircle2 className="h-3.5 w-3.5" />, onClick: () => handleStatusChange(user, "active") }
                        : { label: "Banir usuário", icon: <Ban className="h-3.5 w-3.5" />, onClick: () => handleStatusChange(user, "banned"), variant: "destructive" as const },
                    ]}
                    align="right"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {users.length === 0 && (
          <div className="py-12 text-center text-sm text-foreground-muted">
            Nenhum usuário encontrado para os filtros aplicados.
          </div>
        )}
      </div>

      {/* Create dialog */}
      <Dialog
        open={createOpen}
        onClose={closeCreateDialog}
        title="Criar usuário"
        description={generatedPassword ? "Usuário criado. Compartilhe a senha temporária abaixo com ele." : "Ainda não temos envio de email configurado — a senha temporária aparece aqui após criar."}
      >
        {!generatedPassword ? (
          <div className="space-y-4">
            <Input label="Nome" placeholder="Nome completo" value={createForm.name} onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))} />
            <Input label="Email" type="email" placeholder="usuario@email.com" value={createForm.email} onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))} />
            <Select
              label="Papel"
              options={[{ value: "student", label: "Aluno" }, { value: "teacher", label: "Professor" }, { value: "admin", label: "Admin" }]}
              value={createForm.role}
              onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value as UserRole }))}
            />
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-foreground-muted">Senha temporária de <strong className="text-foreground">{createForm.email}</strong>:</p>
            <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2">
              <code className="flex-1 text-sm font-mono text-foreground">{generatedPassword}</code>
              <button
                type="button"
                onClick={() => { navigator.clipboard.writeText(generatedPassword); success("Senha copiada."); }}
                className="text-foreground-muted hover:text-foreground"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
        <DialogFooter>
          {!generatedPassword ? (
            <>
              <Button variant="outline" onClick={closeCreateDialog}>Cancelar</Button>
              <Button onClick={handleCreate}>Criar usuário</Button>
            </>
          ) : (
            <Button onClick={closeCreateDialog}>Concluir</Button>
          )}
        </DialogFooter>
      </Dialog>

      {/* Alterar email */}
      <Dialog
        open={!!emailUser}
        onClose={() => setEmailUser(null)}
        title="Alterar email"
        description={emailUser ? `Define o email de login de ${emailUser.name}. Use um email real para permitir recuperação de senha.` : ""}
      >
        <Input label="Email" type="email" placeholder="usuario@email.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
        <DialogFooter>
          <Button variant="outline" onClick={() => setEmailUser(null)}>Cancelar</Button>
          <Button onClick={handleUpdateEmail}>Salvar</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
