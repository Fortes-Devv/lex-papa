import { NavShell, type PanelData } from "@/components/layout/nav-shell/nav-shell";
import { ViewSwitch } from "@/components/layout/view-switch";
import { requireArea } from "@/lib/auth-guards";
import { db } from "@/lib/db";
import { getBunnyStorageBytes } from "@/lib/bunny";
import { classifyUser, type EnrollmentLite, type UserKind } from "@/lib/user-kinds";

const ROLE_LABEL: Record<string, string> = { admin: "Administrador", moderator: "Moderador" };

// Números do painel contextual (contadores dos filtros e cursos recentes).
async function loadPanelData(): Promise<{ panel: PanelData; pendingOrders: number }> {
  // Sequencial: o driver Neon não gosta de muitas queries em paralelo.
  const courseStatus = await db.product.groupBy({ by: ["status"], where: { type: "course" }, _count: true });
  const productGroups = await db.product.groupBy({ by: ["status", "type"], _count: true });
  const recentCourses = await db.product.findMany({
    where: { type: "course", course: { isNot: null } },
    orderBy: { updatedAt: "desc" },
    take: 3,
    select: { title: true, status: true, course: { select: { id: true, _count: { select: { modules: true } } } } },
  });
  const userRoles = await db.user.groupBy({ by: ["role"], _count: true });
  const userStatus = await db.user.groupBy({ by: ["status"], _count: true });
  // Contas de aluno por situação (cadastrado / aluno / assinante / encerrado).
  const studentEnrollments = await db.enrollment.findMany({ select: { userId: true, status: true, expiresAt: true, product: { select: { id: true, title: true, type: true } } } });
  const byUser = new Map<string, EnrollmentLite[]>();
  for (const e of studentEnrollments) byUser.set(e.userId, [...(byUser.get(e.userId) ?? []), e]);
  const studentIds = await db.user.findMany({ where: { role: "student" }, select: { id: true } });
  const kinds: Record<UserKind, number> = { cadastrado: 0, aluno: 0, assinante: 0, encerrado: 0, equipe: 0 };
  for (const u of studentIds) kinds[classifyUser("student", byUser.get(u.id) ?? []).kind]++;
  const orderStatus = await db.order.groupBy({ by: ["status"], _count: true });
  const storage = await getBunnyStorageBytes();

  const count = <T extends { _count: number }>(rows: T[], pick: (r: T) => boolean) => rows.filter(pick).reduce((s, r) => s + r._count, 0);
  const pendingOrders = count(orderStatus, (r) => r.status === "pending" || r.status === "processing");

  return {
    pendingOrders,
    panel: {
      dashboard: storage === null ? {} : { footer: { label: "Armazenamento de vídeo", value: `${(storage / 1024 ** 3).toFixed(1).replace(".", ",")} GB usados no Bunny` } },
      courses: {
        counts: {
          all: count(courseStatus, () => true),
          published: count(courseStatus, (r) => r.status === "published"),
          draft: count(courseStatus, (r) => r.status === "draft"),
        },
        recents: recentCourses.map((p) => ({
          href: `/admin/courses/${p.course!.id}`,
          title: p.title,
          subtitle: `${p.course!._count.modules} módulos · ${p.status === "published" ? "Publicado" : "Rascunho"}`,
          mark: "LEX",
        })),
      },
      products: {
        counts: {
          all: count(productGroups, () => true),
          active: count(productGroups, (r) => r.status === "published"),
          inactive: count(productGroups, (r) => r.status !== "published"),
          course: count(productGroups, (r) => r.type === "course"),
          bundle: count(productGroups, (r) => r.type === "bundle"),
          subscription: count(productGroups, (r) => r.type === "subscription"),
        },
      },
      users: {
        counts: {
          all: count(userRoles, (r) => r.role !== "teacher"),
          cadastrado: kinds.cadastrado,
          aluno: kinds.aluno,
          assinante: kinds.assinante,
          encerrado: kinds.encerrado,
          equipe: count(userRoles, (r) => r.role === "admin" || r.role === "moderator"),
          active: count(userStatus, (r) => r.status === "active"),
          inactive: count(userStatus, (r) => r.status === "inactive"),
          banned: count(userStatus, (r) => r.status === "banned"),
        },
      },
      orders: {
        counts: {
          all: count(orderStatus, () => true),
          pending: pendingOrders,
          paid: count(orderStatus, (r) => r.status === "paid"),
          cancelled: count(orderStatus, (r) => r.status === "cancelled" || r.status === "failed"),
          refunded: count(orderStatus, (r) => r.status === "refunded" || r.status === "chargeback"),
        },
      },
    },
  };
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireArea("admin");
  const { panel, pendingOrders } = await loadPanelData();
  return (
    <NavShell area="admin" user={{ name: session.user.name ?? "Admin", roleLabel: ROLE_LABEL[session.user.role] ?? "Equipe" }} pendingOrders={pendingOrders} panelData={panel}>
      {children}
      <ViewSwitch to="student" />
    </NavShell>
  );
}
