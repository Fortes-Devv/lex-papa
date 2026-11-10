import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { syncModulePlaylist } from "@/lib/youtube-sync";

// Checagem diária (Vercel Cron, ver vercel.json): puxa os vídeos novos das playlists
// acompanhadas pelos módulos. A Vercel manda "Authorization: Bearer <CRON_SECRET>".
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const modules = await db.module.findMany({ where: { youtubePlaylistId: { not: null } }, select: { id: true, title: true } });
  const results: { moduleId: string; created?: number; error?: string }[] = [];
  for (const m of modules) {
    try {
      const res = await syncModulePlaylist(m.id);
      results.push({ moduleId: m.id, created: res.created });
      if (res.created > 0) await logAudit({ action: "module.youtube_synced", resourceType: "module", resourceId: m.id, metadata: { created: res.created, auto: true } });
    } catch (err) {
      console.error("[youtube-sync] módulo", m.id, m.title, err);
      results.push({ moduleId: m.id, error: err instanceof Error ? err.message : "erro" });
    }
  }
  return NextResponse.json({ modules: modules.length, created: results.reduce((s, r) => s + (r.created ?? 0), 0), results });
}
