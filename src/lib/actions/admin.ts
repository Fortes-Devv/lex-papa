"use server";

import { revalidatePath } from "next/cache";
import { requireModerator } from "@/lib/auth-guards";
import { saveSettings, type PlatformSettingsData } from "@/lib/settings";
import { logAudit } from "@/lib/audit";

export async function savePlatformSettings(data: PlatformSettingsData) {
  const session = await requireModerator();
  await saveSettings(data);
  await logAudit({ actorId: session.user.id, action: "settings.updated", resourceType: "settings" });
  revalidatePath("/admin/settings");
  revalidatePath("/admin/integrations");
  return { success: true as const };
}
