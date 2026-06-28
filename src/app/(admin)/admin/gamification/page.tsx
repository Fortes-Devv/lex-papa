"use client";
import { useState } from "react";
import { Plus, Edit, Zap, Flame, Star, Trophy, Medal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { MOCK_ACHIEVEMENTS } from "@/lib/mock/data";

export default function AdminGamificationPage() {
  const { success } = useToast();
  const [enabled, setEnabled] = useState({ xp: true, achievements: true, ranking: true, streak: true });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Gamificação</h1>
          <p className="text-sm text-foreground-muted mt-0.5">Configure XP, conquistas, rankings e sequências</p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />}>Nova conquista</Button>
      </div>

      {/* Feature toggles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { key: "xp", label: "Sistema de XP", icon: <Zap className="h-5 w-5" />, desc: "Pontos de experiência" },
          { key: "achievements", label: "Conquistas", icon: <Medal className="h-5 w-5" />, desc: "Badges e prêmios" },
          { key: "ranking", label: "Ranking", icon: <Trophy className="h-5 w-5" />, desc: "Placar de líderes" },
          { key: "streak", label: "Sequências", icon: <Flame className="h-5 w-5" />, desc: "Dias consecutivos" },
        ].map((feature) => (
          <Card key={feature.key} className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="text-primary">{feature.icon}</div>
              <Switch
                size="sm"
                checked={enabled[feature.key as keyof typeof enabled]}
                onChange={(v) => setEnabled((e) => ({ ...e, [feature.key]: v }))}
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{feature.label}</p>
              <p className="text-xs text-foreground-muted">{feature.desc}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* XP Config */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader><CardTitle>Configuração de XP</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[
              { action: "Assistir aula (80%)", xp: 50 },
              { action: "Concluir aula", xp: 75 },
              { action: "Concluir módulo", xp: 200 },
              { action: "Concluir curso", xp: 1000 },
              { action: "Completar quiz (nota máx.)", xp: 150 },
              { action: "Comentar numa aula", xp: 10 },
              { action: "Avaliação do curso", xp: 50 },
            ].map((item) => (
              <div key={item.action} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <span className="text-sm text-foreground">{item.action}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="default">+{item.xp} XP</Badge>
                  <Button variant="ghost" size="xs">Editar</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Conquistas ({MOCK_ACHIEVEMENTS.length})</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {MOCK_ACHIEVEMENTS.map((ach) => (
                <div key={ach.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                  <div className="h-8 w-8 rounded-full flex items-center justify-center text-sm shrink-0" style={{ background: ach.badgeColor + "20", color: ach.badgeColor }}>★</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{ach.title}</p>
                    <p className="text-xs text-foreground-muted">{ach.description}</p>
                  </div>
                  <Badge variant="default" className="shrink-0">+{ach.xpReward}</Badge>
                  <Button variant="ghost" size="icon-sm" onClick={() => success("Conquista editada!")}><Edit className="h-3.5 w-3.5" /></Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
