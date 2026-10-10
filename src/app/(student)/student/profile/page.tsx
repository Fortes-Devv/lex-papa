export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { requireArea } from "@/lib/auth-guards";
import { db } from "@/lib/db";
import { getUserXp } from "@/lib/gamification";
import { isEnrollmentActive } from "@/lib/access";
import { getStudyStats } from "@/lib/student-area";
import { ProfileClient, type ProfileSection } from "./profile-client";

const SECTIONS: ProfileSection[] = ["acessos", "pagamentos", "dados", "preferencias", "notificacoes", "seguranca", "conquistas"];

// Perfil (modelo 7e): meus acessos, pagamentos, dados pessoais, preferências, notificações e senha.
export default async function StudentProfilePage(props: { searchParams: Promise<{ secao?: string }> }) {
  const { secao } = await props.searchParams;
  const session = await requireArea("student");
  const userId = session.user.id;
  const section: ProfileSection = SECTIONS.includes(secao as ProfileSection) ? (secao as ProfileSection) : "acessos";

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) redirect("/login");
  const xp = await getUserXp(userId);
  const stats = await getStudyStats(userId);
  const achievements = await db.userAchievement.findMany({ where: { userId }, include: { achievement: true } });
  const enrollments = await db.enrollment.findMany({
    where: { userId },
    orderBy: { enrolledAt: "desc" },
    include: { product: { select: { title: true, thumbnail: true, slug: true, course: { select: { id: true, modules: { where: { isPublished: true, section: "aulas" }, select: { moduleId: true } } } } } }, order: { select: { id: true, createdAt: true, total: true, paymentMethod: true } } },
  });
  const orders = await db.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { items: { include: { product: { select: { title: true } } } } },
  });
  const notifications = await db.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 30 });

  return (
    <ProfileClient
      section={section}
      user={{
        name: user.name,
        email: user.email,
        avatar: user.avatar ?? undefined,
        bio: user.bio ?? "",
        phone: user.phone ?? "",
        location: user.location ?? "",
        createdAt: user.createdAt.toISOString(),
        weeklyGoalMinutes: user.weeklyGoalMinutes,
      }}
      streak={stats.streak}
      xp={xp}
      achievements={achievements.map((ua) => ({
        id: ua.id,
        title: ua.achievement.title,
        description: ua.achievement.description,
        xpReward: ua.achievement.xpReward,
        badgeColor: ua.achievement.badgeColor,
      }))}
      accesses={enrollments.map((e) => ({
        id: e.id,
        title: e.product.title,
        thumbnail: e.product.thumbnail,
        slug: e.product.slug,
        courseId: e.product.course?.id ?? null,
        modules: e.product.course?.modules.length ?? 0,
        progress: e.progress,
        active: isEnrollmentActive(e),
        expiresAt: e.expiresAt?.toISOString() ?? null,
        order: e.order ? { id: e.order.id, createdAt: e.order.createdAt.toISOString(), total: Number(e.order.total), paymentMethod: e.order.paymentMethod } : null,
      }))}
      orders={orders.map((o) => ({
        id: o.id,
        title: o.items.map((i) => i.product.title).join(", ") || "Pedido",
        productId: o.items[0]?.productId ?? null,
        status: o.status,
        total: Number(o.total),
        paymentMethod: o.paymentMethod,
        createdAt: o.createdAt.toISOString(),
      }))}
      notifications={notifications.map((n) => ({ id: n.id, title: n.title, message: n.message, link: n.link, isRead: n.isRead, createdAt: n.createdAt.toISOString() }))}
    />
  );
}
