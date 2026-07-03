import { db } from "@/lib/db";

// Nível é derivado do XP total: cada nível exige 200 XP a mais que o anterior.
// Nível 1: 0–199, Nível 2: 200–499, Nível 3: 500–899, ...
export function levelFromXp(totalXp: number) {
  let level = 1;
  let required = 0;
  let step = 200;
  while (totalXp >= required + step) {
    required += step;
    level += 1;
    step += 100;
  }
  return {
    level,
    currentLevelXp: totalXp - required,
    nextLevelXp: step,
  };
}

export async function getUserXp(userId: string) {
  const row = await db.userXP.findUnique({ where: { userId } });
  const totalXp = row?.totalXp ?? 0;
  const { level, currentLevelXp, nextLevelXp } = levelFromXp(totalXp);
  return {
    totalXp,
    level,
    currentLevelXp,
    nextLevelXp,
    streak: row?.streak ?? 0,
    lastActivityDate: row?.lastActivityDate ?? null,
  };
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function isYesterday(prev: Date, now: Date) {
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  return isSameDay(prev, y);
}

// Concede XP e atualiza a sequência (streak) de dias ativos.
export async function awardXp(userId: string, amount: number) {
  const now = new Date();
  const existing = await db.userXP.findUnique({ where: { userId } });

  let streak = 1;
  if (existing?.lastActivityDate) {
    if (isSameDay(existing.lastActivityDate, now)) streak = existing.streak;
    else if (isYesterday(existing.lastActivityDate, now)) streak = existing.streak + 1;
    else streak = 1;
  }

  await db.userXP.upsert({
    where: { userId },
    update: { totalXp: { increment: amount }, streak, lastActivityDate: now },
    create: { userId, totalXp: amount, streak: 1, lastActivityDate: now },
  });
}
