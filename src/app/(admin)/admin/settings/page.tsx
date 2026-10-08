export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { SettingsClient, type StaffRow, type SecurityEvent } from "./settings-client";

// Ações que valem aparecer em Segurança (mudança de papel, reembolso, repasse etc.).
const SENSITIVE = ["user.password_reset_by_admin", "user.purchases_transferred", "user.deleted", "user.updated", "user.created", "user.imported", "settings.updated", "order.refunded", "order.manual_release", "order.cancelled", "payout.processed", "product.deleted"];

export default async function AdminSettingsPage() {
  const settings = await getSettings();
  const staff = await db.user.findMany({
    where: { role: { in: ["admin", "moderator"] } },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: { id: true, name: true, email: true, avatar: true, role: true, status: true, lastLoginAt: true, twoFactorEnabled: true },
  });
  const events = await db.auditLog.findMany({
    where: { action: { in: SENSITIVE } },
    orderBy: { createdAt: "desc" },
    take: 15,
    select: { id: true, action: true, createdAt: true, ipAddress: true, actor: { select: { name: true } } },
  });

  const staffRows: StaffRow[] = staff.map((u) => ({ ...u, avatar: u.avatar ?? null, lastLoginAt: u.lastLoginAt?.toISOString() ?? null }));
  const securityEvents: SecurityEvent[] = events.map((e) => ({ id: e.id, action: e.action, at: e.createdAt.toISOString(), ip: e.ipAddress, actor: e.actor?.name ?? "Sistema" }));
  return <SettingsClient settings={settings} staff={staffRows} events={securityEvents} />;
}
