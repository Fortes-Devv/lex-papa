"use client";
import { useEffect, useState, useMemo, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus, MoreHorizontal, Shield, Ban, CheckCircle2, UserCog, Copy, Mail, ChevronLeft, ChevronRight, KeyRound, ArrowRightLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dropdown } from "@/components/ui/dropdown";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { formatRelativeDate, cn } from "@/lib/utils/cn";
import { PageHeader, Pill, tableHeadClass } from "@/components/admin/page-kit";
import { ImportUsersDialog } from "./import-users-dialog";
import { createUserByAdmin, updateUserRole, updateUserStatus, deleteUserWithoutPurchases } from "@/lib/actions/users";
import { SupportDialogs, type SupportAction } from "./support-dialogs";
import { KIND_LABEL, kindFromParam, type UserKind } from "@/lib/user-kinds";
import { CdnImg } from "@/components/ui/cdn-img";
import type { User, UserRole, UserStatus } from "@/lib/types";

const roleLabels: Record<UserRole, string> = { admin: "Admin", teacher: "Professor", student: "Aluno", moderator: "Moderador" }; // "teacher" não existe mais como usuário
const statusLabels: Record<UserStatus, string> = { active: "Ativo", inactive: "Inativo", banned: "Bloqueado", pending: "Pendente" };

export interface UserExtra {
  kind?: UserKind;
  courseIds?: string[]; // cursos com acesso válido
  courseTitles?: string[];
  course?: { title: string; progress: number; expired: boolean };
}

const PAGE_SIZE = 25;

const KIND_TONE: Record<UserKind, "ok" | "gray" | "danger" | "brand"> = { cadastrado: "gray", aluno: "ok", assinante: "brand", encerrado: "danger", equipe: "gray" };
const KIND_TITLE: Record<UserKind | "contas", string> = {
  cadastrado: "Cadastrados (sem compra)", aluno: "Alunos", assinante: "Assinantes", encerrado: "Acesso encerrado",
  equipe: "Equipe", contas: "Contas de alunos",
};

export function UsersClient({ initialUsers, extras = {}, newThisWeek = 0, courses = [] }: { initialUsers: User[]; extras?: Record<string, UserExtra>; newThisWeek?: number; courses?: { id: string; title: string }[] }) {
  const { success, error } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<UserKind | "contas" | null>(null);
  const [courseFilter, setCourseFilter] = useState("");
  const [support, setSupport] = useState<SupportAction>(null);
  const [statusFilter, setStatusFilter] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [page, setPage] = useState(1);

  // Filtros do painel (?papel=cadastrado|aluno|assinante|encerrado|equipe, ?situacao=, ?curso=, ?q=, ?novo=1).
  const searchParams = useSearchParams();
  const pathname = usePathname();
  useEffect(() => {
    setKindFilter(kindFromParam(searchParams.get("papel")));
    setCourseFilter(searchParams.get("curso") ?? "");
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


  const users = useMemo(() => {
    return initialUsers.filter((u) => {
      const matchSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
      const kind = extras[u.id]?.kind;
      const matchKind = !kindFilter || (kindFilter === "contas" ? u.role === "student" : kind === kindFilter);
      const matchCourse = !courseFilter || (extras[u.id]?.courseIds ?? []).includes(courseFilter);
      const matchStatus = !statusFilter || u.status === statusFilter;
      return matchSearch && matchKind && matchCourse && matchStatus;
    });
  }, [initialUsers, extras, search, kindFilter, courseFilter, statusFilter]);

  // Filtro de curso fica na URL (?curso=) junto com os filtros do painel.
  function changeCourse(id: string) {
    const p = new URLSearchParams(searchParams.toString());
    if (id) p.set("curso", id); else p.delete("curso");
    router.replace(`${pathname}${p.toString() ? `?${p}` : ""}`, { scroll: false });
  }

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

  const pages = Math.max(1, Math.ceil(users.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const pageUsers = users.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const statusTone: Record<UserStatus, "ok" | "gray" | "danger" | "brand"> = { active: "ok", inactive: "gray", banned: "danger", pending: "brand" };
  const lastAccess = (u: User) => (u.lastLoginAt ? formatRelativeDate(u.lastLoginAt) : "Nunca");

  function actions(user: User) {
    return [
      { label: "Tornar admin", icon: <Shield className="h-3.5 w-3.5" />, onClick: () => handleRoleChange(user, "admin") },
      { label: "Tornar aluno", icon: <UserCog className="h-3.5 w-3.5" />, onClick: () => handleRoleChange(user, "student") },
      { separator: true as const },
      { label: "Editar dados", icon: <Mail className="h-3.5 w-3.5" />, onClick: () => setSupport({ kind: "edit", userId: user.id, name: user.name, email: user.email, phone: user.phone, status: user.status }) },
      { label: "Gerar senha temporária", icon: <KeyRound className="h-3.5 w-3.5" />, onClick: () => setSupport({ kind: "password", userId: user.id, name: user.name, email: user.email }) },
      { label: "Mover cursos para outra conta", icon: <ArrowRightLeft className="h-3.5 w-3.5" />, onClick: () => setSupport({ kind: "transfer", userId: user.id, name: user.name, email: user.email }) },
      { separator: true as const },
      { label: "Excluir conta (sem compras)", icon: <Trash2 className="h-3.5 w-3.5" />, variant: "destructive" as const, onClick: async () => {
        if (!confirm(`Excluir a conta de ${user.name} (${user.email})? Só funciona se ela não tiver compras.`)) return;
        const res = await deleteUserWithoutPurchases(user.id);
        if (!res.success) { error(res.error); return; }
        success(res.message);
        startTransition(() => router.refresh());
      } },
      user.status === "banned"
        ? { label: "Reativar usuário", icon: <CheckCircle2 className="h-3.5 w-3.5" />, onClick: () => handleStatusChange(user, "active") }
        : { label: "Bloquear usuário", icon: <Ban className="h-3.5 w-3.5" />, onClick: () => handleStatusChange(user, "banned"), variant: "destructive" as const },
    ];
  }

  // Curso + progresso do aluno.
  function CourseCell({ user }: { user: User }) {
    const x = extras[user.id];
    if (x?.kind === "cadastrado") return <span className="text-[12.5px] text-foreground-muted">Nenhuma compra</span>;
    if (x?.kind === "equipe") return <span className="text-foreground-subtle">—</span>;
    if (x?.kind === "encerrado") return <span className="text-[12.5px] text-foreground-muted">{x.course?.title ?? "Curso"} · encerrado</span>;
    if (x?.course) {
      const more = (x.courseTitles?.length ?? 0) - 1;
      return (
        <div className="min-w-0">
          <p className="truncate text-[12.5px] font-semibold text-foreground" title={x.courseTitles?.join(", ")}>{x.course.title}{more > 0 ? ` +${more}` : ""}</p>
          <div className="mt-1.5 h-1 w-full max-w-[180px] overflow-hidden rounded-full bg-line-soft dark:bg-white/10">
            <div className={cn("h-full rounded-full", x.course.progress >= 100 ? "bg-ok" : "bg-brand")} style={{ width: `${Math.max(2, x.course.progress)}%` }} />
          </div>
        </div>
      );
    }
    return <span className="text-foreground-subtle">—</span>;
  }

  const initials = (name: string) => name.split(/\s+/).filter(Boolean).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const avatar = (u: User) => (
    <span className={cn("grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full text-xs font-extrabold",
      u.status === "banned" ? "bg-line-soft text-ink-faint dark:bg-white/10" : u.role === "student" ? "bg-navy text-brand" : "bg-brand text-white")}>
      {u.avatar ? <CdnImg src={u.avatar} width={72} aspect="1:1" alt="" className="h-full w-full rounded-full object-cover" /> : initials(u.name)}
    </span>
  );

  return (
    <div>
      <PageHeader
        title={kindFilter ? KIND_TITLE[kindFilter] : "Todos os usuários"}
        subtitle={`${users.length.toLocaleString("pt-BR")} ${search || kindFilter || statusFilter || courseFilter ? "encontrados" : "cadastrados"} · ${newThisWeek} novo${newThisWeek !== 1 ? "s" : ""} esta semana`}
        actions={<>
          {courses.length > 0 && kindFilter !== "equipe" && (
            <select value={courseFilter} onChange={(e) => changeCourse(e.target.value)} aria-label="Filtrar por curso"
              className="h-9 max-w-[220px] rounded-lg border border-line-strong bg-card px-2 text-[13px] font-semibold text-foreground dark:border-white/10">
              <option value="">Todos os cursos</option>
              {courses.map((c) => <option key={c.id} value={c.id}>Alunos de: {c.title}</option>)}
            </select>
          )}
          <ImportUsersDialog />
          <Button onClick={() => setCreateOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>Novo usuário</Button>
        </>}
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
            <span><Pill tone={KIND_TONE[extras[user.id]?.kind ?? "cadastrado"]}>{KIND_LABEL[extras[user.id]?.kind ?? "cadastrado"]}</Pill></span>
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
                  <Pill tone={KIND_TONE[x?.kind ?? "cadastrado"]} className="shrink-0">{KIND_LABEL[x?.kind ?? "cadastrado"]}</Pill>
                </div>
                <p className="truncate text-[11.5px] text-foreground-muted">
                  {x?.courseTitles?.length ? `${x.courseTitles.join(", ")} · ${lastAccess(user)}` : `${KIND_LABEL[x?.kind ?? "cadastrado"]} · ${lastAccess(user)}`}
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
              options={[{ value: "student", label: "Aluno (conta com login)" }, { value: "admin", label: "Admin" }]}
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

      <SupportDialogs action={support} onClose={() => setSupport(null)} />

    </div>
  );
}
