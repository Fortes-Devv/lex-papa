import { db } from "@/lib/db";

export interface PlatformSettingsData {
  general: {
    name: string;
    tagline: string;
    supportEmail: string;
    currency: string;
  };
  gamification: {
    xpEnabled: boolean;
    achievementsEnabled: boolean;
    rankingEnabled: boolean;
    streakEnabled: boolean;
    xpPerLesson: number;
    xpPerCourse: number;
  };
  integrations: {
    googleAnalyticsId: string;
    metaPixelId: string;
    whatsappNumber: string;
  };
}

export const DEFAULT_SETTINGS: PlatformSettingsData = {
  general: { name: "LEX Concursos", tagline: "Sua aprovação começa aqui", supportEmail: "suporte@lexconcursos.com", currency: "BRL" },
  gamification: { xpEnabled: true, achievementsEnabled: true, rankingEnabled: true, streakEnabled: true, xpPerLesson: 50, xpPerCourse: 1000 },
  integrations: { googleAnalyticsId: "", metaPixelId: "", whatsappNumber: "" },
};

export async function getSettings(): Promise<PlatformSettingsData> {
  const row = await db.platformSettings.findUnique({ where: { id: "singleton" } });
  if (!row) return DEFAULT_SETTINGS;
  // Faz merge com os defaults para tolerar campos ausentes em versões antigas.
  const stored = row.data as Partial<PlatformSettingsData>;
  return {
    general: { ...DEFAULT_SETTINGS.general, ...stored.general },
    gamification: { ...DEFAULT_SETTINGS.gamification, ...stored.gamification },
    integrations: { ...DEFAULT_SETTINGS.integrations, ...stored.integrations },
  };
}

export async function saveSettings(data: PlatformSettingsData) {
  const json = data as unknown as Record<string, unknown>;
  await db.platformSettings.upsert({
    where: { id: "singleton" },
    update: { data: json as never },
    create: { id: "singleton", data: json as never },
  });
}
