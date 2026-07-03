export const dynamic = "force-dynamic";
import { getSettings } from "@/lib/settings";
import { SettingsClient } from "./settings-client";

export default async function AdminSettingsPage() {
  const settings = await getSettings();
  return <SettingsClient settings={settings} />;
}
