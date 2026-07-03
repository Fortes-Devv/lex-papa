"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Zap, Flame, Trophy, Medal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { createAchievement, deleteAchievement, savePlatformSettings } from "@/lib/actions/admin";
import { DEFAULT_SETTINGS } from "@/lib/settings";

export interface AchievementRow {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  badgeColor: string;
  unlockedBy: number;
}
interface GamificationSettings {
  xpEnabled: boolean;
  achievementsEnabled: boolean;
  rankingEnabled: boolean;
  streakEnabled: boolean;
  xpPerLesson: number;
  xpPerCourse: number;
}

export function GamificationClient({ achievements, settings: initialSettings }: { achievements: AchievementRow[]; settings: GamificationSettings }) {
  const { success, error } = useToast();
  const router = useRouter();
  const [settings, setSettings] = useState(initialSettings);
  const [savingSettings, setSavingSettings] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", xpReward: "100", badgeColor: "#5E6AD2" });

  async function saveToggles(next: GamificationSettings) {
    setSettings(next);
    setSavingSettings(true);
    await savePlatformSettings({ ...DEFAULT_SETTINGS, gamification: next });
    setSavingSettings(false);
  }

  async function handleCreate() {
    if (!form.title.trim()) { error("Dê um título à conquista."); return; }
    const result = await createAchievement({ title: form.title, description: form.description, xpReward: Number(form.xpReward) || 0, badgeColor: form.badgeColor });
    if (!result.success) { error(result.error); return; }
    success("Conquista criada!");
    setDialogOpen(false);
    setForm({ title: "", description: "", xpReward: "100", badgeColor: "#5E6AD2" });
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta conquista?")) return;
    await deleteAchievement(id);
    success("Conquista removida.");
    router.refresh();
  }

  const features = [
    { key: "xpEnabled" as const, label: "Sistema de XP", icon: <Zap className="h-5 w-5" />, desc: "Pontos de experiência" },
    { key: "achievementsEnabled" as const, label: "Conquistas", icon: <Medal className="h-5 w-5" />, desc: "Badges e prêmios" },
    { key: "rankingEnabled" as const, label: "Ranking", icon: <Trophy className="h-5 w-5" />, desc: "Placar de líderes" },
    { key: "streakEnabled" as const, label: "Sequências", icon: <Flame className="h-5 w-5" />, desc: "Dias consecutivos" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Gamificação</h1>
          <p className="text-sm text-foreground-muted mt-0.5">Configure XP, conquistas, rankings e sequências</p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setDialogOpen(true)}>Nova conquista</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {features.map((feature) => (
          <Card key={feature.key} className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="text-primary">{feature.icon}</div>
              <Switch size="sm" checked={settings[feature.key]} onChange={(v) => saveToggles({ ...settings, [feature.key]: v })} />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{feature.label}</p>
              <p className="text-xs text-foreground-muted">{feature.desc}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader><CardTitle>Configuração de XP</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Input label="XP por aula concluída" type="number" min="0" value={String(settings.xpPerLesson)} onChange={(e) => setSettings((s) => ({ ...s, xpPerLesson: Number(e.target.value) }))} />
            <Input label="XP por curso concluído" type="number" min="0" value={String(settings.xpPerCourse)} onChange={(e) => setSettings((s) => ({ ...s, xpPerCourse: Number(e.target.value) }))} />
          </CardContent>
          <CardFooter>
            <Button loading={savingSettings} onClick={() => saveToggles(settings)}>Salvar configuração</Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader><CardTitle>Conquistas ({achievements.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {achievements.length === 0 && <p className="text-sm text-foreground-muted text-center py-4">Nenhuma conquista cadastrada.</p>}
            {achievements.map((ach) => (
              <div key={ach.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                <div className="h-8 w-8 rounded-full flex items-center justify-center text-sm shrink-0" style={{ background: ach.badgeColor + "20", color: ach.badgeColor }}>★</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{ach.title}</p>
                  <p className="text-xs text-foreground-muted">{ach.description} · {ach.unlockedBy} desbloqueada{ach.unlockedBy !== 1 ? "s" : ""}</p>
                </div>
                <Badge variant="default" className="shrink-0">+{ach.xpReward}</Badge>
                <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(ach.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="Nova conquista">
        <div className="space-y-4">
          <Input label="Título" placeholder="Ex: Primeira aula concluída" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          <Input label="Descrição" placeholder="Como desbloquear" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Recompensa (XP)" type="number" min="0" value={form.xpReward} onChange={(e) => setForm((f) => ({ ...f, xpReward: e.target.value }))} />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Cor do badge</label>
              <input type="color" value={form.badgeColor} onChange={(e) => setForm((f) => ({ ...f, badgeColor: e.target.value }))} className="h-9 w-full rounded-md border border-border bg-background" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleCreate}>Criar conquista</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
