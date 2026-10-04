export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { UsersClient, type UserExtra } from "./users-client";
import type { User } from "@/lib/types";
import { classifyUser, type EnrollmentLite } from "@/lib/user-kinds";

export default async function AdminUsersPage() {
  const rows = await db.user.findMany({ orderBy: { createdAt: "desc" } });

  // Curso/progresso do aluno (matrícula acessada por último) e carga do professor.
  const enrollments = await db.enrollment.findMany({
    orderBy: [{ lastAccessedAt: { sort: "desc", nulls: "last" } }, { enrolledAt: "desc" }],
    select: { userId: true, progress: true, status: true, expiresAt: true, product: { select: { id: true, title: true, type: true } } },
  });
  const courses = await db.product.findMany({ where: { type: { in: ["course", "subscription", "bundle"] } }, orderBy: { title: "asc" }, select: { id: true, title: true } });
  const teaching = await db.module.findMany({
    where: { instructorId: { not: null } },
    select: { instructorId: true, _count: { select: { lessons: true } } },
  });

  const extras: Record<string, UserExtra> = {};
  const byUser = new Map<string, EnrollmentLite[]>();
  for (const e of enrollments) byUser.set(e.userId, [...(byUser.get(e.userId) ?? []), e]);
  for (const u of rows) {
    const { kind, active } = classifyUser(u.role, byUser.get(u.id) ?? []);
    extras[u.id] = { kind, courseIds: active.map((e) => e.product.id), courseTitles: active.map((e) => e.product.title) };
  }
  for (const e of enrollments) {
    if (extras[e.userId]?.course) continue; // fica a mais recente
    extras[e.userId] = { ...extras[e.userId], course: { title: e.product.title, progress: e.progress, expired: e.status === "expired" || e.status === "cancelled" } };
  }
  for (const m of teaching) {
    const id = m.instructorId!;
    const t = extras[id]?.teaching ?? { modules: 0, lessons: 0 };
    extras[id] = { ...extras[id], teaching: { modules: t.modules + 1, lessons: t.lessons + m._count.lessons } };
  }

  const weekAgo = Date.now() - 7 * 86_400_000;
  const newThisWeek = rows.filter((u) => u.createdAt.getTime() >= weekAgo).length;

  const users: User[] = rows.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    avatar: u.avatar ?? undefined,
    role: u.role,
    status: u.status,
    bio: u.bio ?? undefined,
    phone: u.phone ?? undefined,
    location: u.location ?? undefined,
    website: u.website ?? undefined,
    twoFactorEnabled: u.twoFactorEnabled,
    emailVerified: u.emailVerified,
    oauthProviders: [],
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
    lastLoginAt: u.lastLoginAt?.toISOString(),
  }));

  return <UsersClient initialUsers={users} extras={extras} newThisWeek={newThisWeek} courses={courses} />;
}
