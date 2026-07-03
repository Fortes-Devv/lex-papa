export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { GamificationClient, type AchievementRow } from "./gamification-client";

export default async function AdminGamificationPage() {
  const [achievements, settings] = await Promise.all([
    db.achievement.findMany({ orderBy: { createdAt: "desc" }, include: { _count: { select: { users: true } } } }),
    getSettings(),
  ]);

  const rows: AchievementRow[] = achievements.map((a) => ({
    id: a.id,
    title: a.title,
    description: a.description,
    xpReward: a.xpReward,
    badgeColor: a.badgeColor,
    unlockedBy: a._count.users,
  }));

  return <GamificationClient achievements={rows} settings={settings.gamification} />;
}
