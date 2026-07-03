"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { saveSettings, type PlatformSettingsData } from "@/lib/settings";
import { logAudit } from "@/lib/audit";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "admin" && session.user.role !== "moderator")) {
    throw new Error("Não autorizado.");
  }
  return session;
}

export async function createAchievement(input: { title: string; description: string; xpReward: number; badgeColor: string }) {
  const session = await requireAdmin();
  if (!input.title.trim()) return { success: false as const, error: "Título obrigatório." };

  const ach = await db.achievement.create({
    data: { title: input.title, description: input.description, xpReward: input.xpReward, badgeColor: input.badgeColor || "#5E6AD2" },
  });
  await logAudit({ actorId: session.user.id, action: "achievement.created", resourceType: "achievement", resourceId: ach.id, metadata: { title: ach.title } });
  revalidatePath("/admin/gamification");
  return { success: true as const };
}

export async function deleteAchievement(id: string) {
  const session = await requireAdmin();
  await db.achievement.delete({ where: { id } });
  await logAudit({ actorId: session.user.id, action: "achievement.deleted", resourceType: "achievement", resourceId: id });
  revalidatePath("/admin/gamification");
  return { success: true as const };
}

export async function savePlatformSettings(data: PlatformSettingsData) {
  const session = await requireAdmin();
  await saveSettings(data);
  await logAudit({ actorId: session.user.id, action: "settings.updated", resourceType: "settings" });
  revalidatePath("/admin/settings");
  revalidatePath("/admin/gamification");
  revalidatePath("/admin/integrations");
  return { success: true as const };
}
