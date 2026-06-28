"use client";
import { useState, useMemo } from "react";
import { Search, Plus, Filter, MoreHorizontal, Shield, Mail, Ban, Trash2, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dropdown } from "@/components/ui/dropdown";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { MOCK_USERS } from "@/lib/mock/data";
import { formatRelativeDate } from "@/lib/utils/cn";
import type { UserRole, UserStatus } from "@/lib/types";

const roleLabels: Record<UserRole, string> = { admin: "Admin", teacher: "Professor", student: "Aluno", moderator: "Moderador" };
const roleVariants: Record<UserRole, "default" | "success" | "secondary" | "warning"> = {
  admin: "default", teacher: "success", student: "secondary", moderator: "warning"
};
const statusVariants: Record<UserStatus, "success" | "secondary" | "destructive" | "warning"> = {
  active: "success", inactive: "secondary", banned: "destructive", pending: "warning"
};
const statusLabels: Record<UserStatus, string> = { active: "Ativo", inactive: "Inativo", banned: "Banido", pending: "Pendente" };

export default function AdminUsersPage() {
  const { success } = useToast();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");

  const users = useMemo(() => {
    return MOCK_USERS.filter((u) => {
      const matchSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
      const matchRole = !roleFilter || u.role === roleFilter;
      const matchStatus = !statusFilter || u.status === statusFilter;
      return matchSearch && matchRole && matchStatus;
    });
  }, [search, roleFilter, statusFilter]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Usuários</h1>
          <p className="text-sm text-foreground-muted mt-0.5">{MOCK_USERS.length} usuários cadastrados</p>
        </div>
        <Button onClick={() => setInviteOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>Convidar usuário</Button>
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
                    trigger={<Button variant="ghost" size="icon-sm"><MoreHorizontal className="h-4 w-4" /></Button>}
                    items={[
                      { label: "Ver perfil", icon: <UserCog className="h-3.5 w-3.5" />, onClick: () => success(`Perfil de ${user.name} aberto.`) },
                      { label: "Enviar email", icon: <Mail className="h-3.5 w-3.5" />, onClick: () => success(`Email enviado para ${user.email}`) },
                      { label: "Alterar papel", icon: <Shield className="h-3.5 w-3.5" />, onClick: () => success(`Papel de ${user.name} alterado.`) },
                      { separator: true },
                      { label: "Banir usuário", icon: <Ban className="h-3.5 w-3.5" />, onClick: () => success(`${user.name} banido.`), variant: "destructive" },
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

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onClose={() => setInviteOpen(false)} title="Convidar usuário" description="Um email de convite será enviado com as instruções de acesso.">
        <div className="space-y-4">
          <Input label="Email" type="email" placeholder="usuario@email.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
          <Select label="Papel" options={[{ value: "student", label: "Aluno" }, { value: "teacher", label: "Professor" }, { value: "admin", label: "Admin" }]} defaultValue="student" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancelar</Button>
          <Button onClick={() => { success("Convite enviado!"); setInviteOpen(false); setInviteEmail(""); }}>Enviar convite</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
