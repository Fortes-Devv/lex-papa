import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isStaffRole } from "@/lib/access";

// ── Guards para server actions / route handlers (lançam erro) ──────────────

export async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");
  return session;
}

/** admin, moderator ou teacher. */
export async function requireStaff() {
  const session = await auth();
  if (!session?.user || !isStaffRole(session.user.role)) throw new Error("Não autorizado.");
  return session;
}

/** admin ou moderator (área administrativa). */
export async function requireModerator() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "admin" && session.user.role !== "moderator")) {
    throw new Error("Não autorizado.");
  }
  return session;
}

/** Somente admin. */
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") throw new Error("Não autorizado.");
  return session;
}

// ── Guard para layouts/páginas (redireciona) ───────────────────────────────

const ROLE_HOME: Record<string, string> = {
  admin: "/admin/dashboard",
  moderator: "/admin/dashboard",
  teacher: "/teacher/dashboard",
  student: "/student/dashboard",
};

const AREA_ROLES: Record<"admin" | "teacher" | "student", string[]> = {
  admin: ["admin", "moderator"],
  teacher: ["teacher"],
  student: ["student"],
};

/** Mesmo critério do middleware, mas checado no servidor (não depende dele). */
export async function requireArea(area: keyof typeof AREA_ROLES) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!AREA_ROLES[area].includes(session.user.role)) redirect(ROLE_HOME[session.user.role] ?? "/login");
  return session;
}
