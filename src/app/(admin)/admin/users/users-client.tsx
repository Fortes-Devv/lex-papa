"use client";
import { useEffect, useState, useMemo, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus, MoreHorizontal, Shield, Ban, CheckCircle2, UserCog, Copy, Mail, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dropdown } from "@/components/ui/dropdown";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { formatRelativeDate, cn } from "@/lib/utils/cn";
import { PageHeader, Pill, tableHeadClass } from "@/components/admin/page-kit";
import { createUserByAdmin, updateUserRole, updateUserStatus, updateUserEmail } from "@/lib/actions/users";
import type { User, UserRole, UserStatus } from "@/lib/types";

const roleLabels: Record<UserRole, string> = { admin: "Admin", teacher: "Professor", student: "Aluno", moderator: "Moderador" };
const statusLabels: Record<UserStatus, string> = { active: "Ativo", inactive: "Inativo", banned: "Bloqueado", pending: "Pendente" };

export interface UserExtra {
  course?: { title: string; progress: number; expired: boolean };
  teaching?: { modules: number; lessons: number };
}

const PAGE_SIZE = 25;

export function UsersClient({ initialUsers, extras = {}, newThisWeek = 0 }: { initialUsers: User[]; extras?: Record<string, UserExtra>; newThisWeek?: number }) {
  const { success, error } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [page, setPage] = useState(1);

  // Filtros do painel de navegação (?papel=student|teacher|admin, ?situacao=active|inactive|banned, ?q=busca, ?novo=1).
  const searchParams = useSearchParams();
  const pathname = usePathname();
  useEffect(() => {
    setRoleFilter(searchParams.get("papel") ?? "");
    setStatusFilter(searchParams.get("situacao") ?? "");
    setPage(1);
    setSearch(searchParams.get("q") ?? "");
    if (searchParams.get("novo") === "1") {
      setCreateOpen(true);
      router.replace(pathname, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  const [createForm, setCreateForm] = useState<{ name: string; email: string; role: UserRole }>({ name: "", email: "", role: "student" });
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);

  const [emailUser, setEmailUser] = useState<User | null>(null);
  const [newEmail, setNewEmail] = useState("");

  const users = useMemo(() => {
    return initialUsers.filter((u) => {
      const matchSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
      // "admin" no painel inclui moderadores (equipe administrativa).
      const matchRole = !roleFilter || u.role === roleFilter || (roleFilter === "admin" && u.role === "moderator");
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

  const pages = Math.max(1, Math.ceil(users.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const pageUsers = users.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const roleTone: Record<UserRole, "gray" | "brand"> = { student: "gray", teacher: "brand", admin: "brand", moderator: "brand" };
  const statusTone: Record<UserStatus, "ok" | "gray" | "danger" | "brand"> = { active: "ok", inactive: "gray", banned: "danger", pending: "brand" };
  const lastAccess = (u: User) => (u.lastLoginAt ? formatRelativeDate(u.lastLoginAt) : "Nunca");

  function actions(user: User) {
    return [
      { label: "Tornar admin", icon: <Shield className="h-3.5 w-3.5" />, onClick: () => handleRoleChange(user, "admin") },
      { label: "Tornar professor", icon: <UserCog className="h-3.5 w-3.5" />, onClick: () => handleRoleChange(user, "teacher") },
      { label: "Tornar aluno", icon: <UserCog className="h-3.5 w-3.5" />, onClick: () => handleRoleChange(user, "student") },
      { separator: true as const },
      { label: "Alterar email", icon: <Mail className="h-3.5 w-3.5" />, onClick: () => openEmailDialog(user) },
      { separator: true as const },
      user.status === "banned"
        ? { label: "Reativar usuário", icon: <CheckCircle2 className="h-3.5 w-3.5" />, onClick: () => handleStatusChange(user, "active") }
        : { label: "Bloquear usuário", icon: <Ban className="h-3.5 w-3.5" />, onClick: () => handleStatusChange(user, "banned"), variant: "destructive" as const },
    ];
  }

  // Curso + progresso (aluno) ou carga de ensino (professor).
  function CourseCell({ user }: { user: User }) {
    const x = extras[user.id];
    if (x?.course) {
      return (
        <div className="min-w-0">
          <p className="truncate text-[12.5px] font-semibold text-foreground">{x.course.title}</p>
          <div className="mt-1.5 h-1 w-full max-w-[180px] overflow-hidden rounded-full bg-line-soft dark:bg-white/10">
            <div className={cn("h-full rounded-full", x.course.progress >= 100 ? "bg-ok" : "bg-brand")} style={{ width: `${Math.max(2, x.course.progress)}%` }} />
          </div>
        </div>
      );
    }
    if (x?.teaching) return <span className="text-[12.5px] text-foreground-muted">{x.teaching.modules} módulo{x.teaching.modules !== 1 ? "s" : ""} · {x.teaching.lessons} aulas</span>;
    return <span className="text-foreground-subtle">—</span>;
  }

  const initials = (name: string) => name.split(/\s+/).filter(Boolean).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const avatar = (u: User) => (
    <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-extrabold",
      u.status === "banned" ? "bg-line-soft text-ink-faint dark:bg-white/10" : u.role === "student" ? "bg-navy text-brand" : "bg-brand text-white")}>
      {initials(u.name)}
    </span>
  );

  return (
    <div>
      <PageHeader
        title={roleFilter === "student" ? "Alunos" : roleFilter === "teacher" ? "Professores" : roleFilter === "admin" ? "Administradores" : "Todos os usuários"}
        subtitle={`${users.length.toLocaleString("pt-BR")} ${search || roleFilter || statusFilter ? "encontrados" : "cadastrados"} · ${newThisWeek} novo${newThisWeek !== 1 ? "s" : ""} esta semana`}
        actions={<Button onClick={() => setCreateOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>Novo usuário</Button>}
      />

      {/* Desktop: tabela */}
      <div className="hidden overflow-hidden rounded-[14px] border border-border bg-card md:block">
        <div className={cn("grid grid-cols-[minmax(220px,2fr)_100px_minmax(160px,1.6fr)_110px_100px_44px] gap-3 border-b border-line-soft bg-[#faf8f5] px-[18px] py-2.5 dark:border-white/10 dark:bg-white/5", tableHeadClass)}>
          <span>Usuário</span><span>Tipo</span><span>Curso / progresso</span><span>Último acesso</span><span>Status</span><span />
        </div>
        {pageUsers.map((user) => (
          <div key={user.id} className={cn("grid grid-cols-[minmax(220px,2fr)_100px_minmax(160px,1.6fr)_110px_100px_44px] items-center gap-3 border-b border-line-soft px-[18px] py-3 last:border-0 hover:bg-background dark:border-white/10", user.status === "banned" && "opacity-60")}>
            <div className="flex min-w-0 items-center gap-3">
              {avatar(user)}
              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-semibold text-foreground">{user.name}</p>
                <p className="truncate text-[11.5px] text-foreground-muted">{user.email}</p>
              </div>
            </div>
            <span><Pill tone={roleTone[user.role]}>{roleLabels[user.role]}</Pill></span>
            <CourseCell user={user} />
            <span className="text-[12.5px] text-foreground-muted">{lastAccess(user)}</span>
            <span><Pill tone={statusTone[user.status]}>{statusLabels[user.status]}</Pill></span>
            <Dropdown align="right" items={actions(user)}
              trigger={<Button variant="ghost" size="icon-sm" disabled={isPending} aria-label={`Ações de ${user.name}`}><MoreHorizontal className="h-4 w-4" /></Button>} />
          </div>
        ))}
        {users.length === 0 && <div className="py-12 text-center text-sm text-foreground-muted">Nenhum usuário encontrado para os filtros aplicados.</div>}
      </div>

      {/* Celular: cards */}
      <div className="flex flex-col gap-2.5 md:hidden">
        {pageUsers.map((user) => {
          const x = extras[user.id];
          return (
            <div key={user.id} className={cn("flex items-center gap-3 rounded-[14px] border border-border bg-card p-3.5", user.status === "banned" && "opacity-60")}>
              {avatar(user)}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-sm font-bold text-foreground">{user.name}</p>
                  <Pill tone={user.role === "student" ? statusTone[user.status] : roleTone[user.role]} className="shrink-0">{user.role === "student" ? statusLabels[user.status] : roleLabels[user.role]}</Pill>
                </div>
                <p className="truncate text-[11.5px] text-foreground-muted">
                  {user.role === "teacher" && x?.teaching ? `${x.teaching.modules} módulos · ${x.teaching.lessons} aulas · ${lastAccess(user)}` : `${roleLabels[user.role]} · ${lastAccess(user)}`}
                </p>
                {x?.course && (
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-line-soft dark:bg-white/10">
                    <div className={cn("h-full rounded-full", x.course.progress >= 100 ? "bg-ok" : "bg-brand")} style={{ width: `${Math.max(2, x.course.progress)}%` }} />
                  </div>
                )}
              </div>
              <Dropdown align="right" items={actions(user)}
                trigger={<span role="button" aria-label={`Ações de ${user.name}`} className="grid h-11 w-11 place-items-center rounded-lg text-foreground-muted"><MoreHorizontal className="h-4 w-4" /></span>} />
            </div>
          );
        })}
        {users.length === 0 && <div className="py-12 text-center text-sm text-foreground-muted">Nenhum usuário encontrado.</div>}
      </div>

      {/* Paginação */}
      {users.length > PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-[12.5px] text-foreground-muted">Mostrando {(current - 1) * PAGE_SIZE + 1}–{Math.min(current * PAGE_SIZE, users.length)} de {users.length.toLocaleString("pt-BR")}</p>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => setPage(current - 1)} disabled={current === 1} aria-label="Página anterior" className="grid h-9 w-9 place-items-center rounded-lg border border-line-strong bg-card text-foreground disabled:opacity-40 dark:border-white/10"><ChevronLeft className="h-4 w-4" /></button>
            {Array.from({ length: pages }, (_, i) => i + 1).filter((p) => p === 1 || p === pages || Math.abs(p - current) <= 1).map((p) => (
              <button key={p} type="button" onClick={() => setPage(p)} aria-current={p === current ? "page" : undefined}
                className={cn("grid h-9 min-w-9 place-items-center rounded-lg border px-2 text-[13px] font-semibold", p === current ? "border-navy bg-navy text-white" : "border-line-strong bg-card text-foreground dark:border-white/10")}>{p}</button>
            ))}
            <button type="button" onClick={() => setPage(current + 1)} disabled={current === pages} aria-label="Próxima página" className="grid h-9 w-9 place-items-center rounded-lg border border-line-strong bg-card text-foreground disabled:opacity-40 dark:border-white/10"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      )}

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
