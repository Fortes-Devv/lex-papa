import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUserXp } from "@/lib/gamification";
import { ProfileClient } from "./profile-client";

export default async function StudentProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [user, xp, achievements] = await Promise.all([
    db.user.findUnique({ where: { id: session.user.id } }),
    getUserXp(session.user.id),
    db.userAchievement.findMany({ where: { userId: session.user.id }, include: { achievement: true } }),
  ]);
  if (!user) redirect("/login");

  return (
    <ProfileClient
      user={{
        name: user.name,
        email: user.email,
        avatar: user.avatar ?? undefined,
        bio: user.bio ?? "",
        phone: user.phone ?? "",
        location: user.location ?? "",
        twoFactorEnabled: user.twoFactorEnabled,
      }}
      xp={xp}
      achievements={achievements.map((ua) => ({
        id: ua.id,
        title: ua.achievement.title,
        description: ua.achievement.description,
        xpReward: ua.achievement.xpReward,
        badgeColor: ua.achievement.badgeColor,
      }))}
    />
  );
}
