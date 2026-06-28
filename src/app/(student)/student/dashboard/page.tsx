"use client";
import Link from "next/link";
import { BookOpen, Award, Flame, Zap, Clock, Play, ArrowRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { MOCK_ENROLLMENTS, MOCK_USER_XP, MOCK_ACHIEVEMENTS, MOCK_NOTIFICATIONS } from "@/lib/mock/data";
import { useCurrentUser } from "@/lib/store/hooks";
import { formatRelativeDate } from "@/lib/utils/cn";

export default function StudentDashboardPage() {
  const user = useCurrentUser();
  const enrollments = MOCK_ENROLLMENTS.filter((e) => e.userId === user.id);
  const xp = MOCK_USER_XP;
  const inProgress = enrollments.filter((e) => e.progress > 0 && e.progress < 100);
  const completed = enrollments.filter((e) => e.progress === 100);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Welcome */}
      <div className="flex items-center gap-4">
        <Avatar src={user.avatar} name={user.name} size="lg" status="online" />
        <div>
          <h1 className="text-xl font-semibold text-foreground">Olá, {user.name.split(" ")[0]}! 👋</h1>
          <p className="text-sm text-foreground-muted">Continue de onde parou.</p>
        </div>
      </div>

      {/* XP + Streak */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Nível", value: xp.level, icon: <Zap className="h-4 w-4" />, color: "text-primary" },
          { label: "XP Total", value: xp.totalXp, icon: <Award className="h-4 w-4" />, color: "text-warning" },
          { label: "Sequência", value: `${xp.streak} dias`, icon: <Flame className="h-4 w-4" />, color: "text-destructive" },
          { label: "Cursos", value: enrollments.length, icon: <BookOpen className="h-4 w-4" />, color: "text-success" },
        ].map((item) => (
          <Card key={item.label} className="flex items-center gap-3">
            <div className={`${item.color} shrink-0`}>{item.icon}</div>
            <div>
              <p className="text-lg font-bold text-foreground">{item.value}</p>
              <p className="text-xs text-foreground-muted">{item.label}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* XP Progress */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-foreground">Progresso de nível</p>
          <Badge variant="default">Nível {xp.level}</Badge>
        </div>
        <Progress value={xp.currentLevelXp} max={xp.nextLevelXp} size="md" showLabel label={`${xp.currentLevelXp} / ${xp.nextLevelXp} XP`} />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Continue learning */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Continuar aprendendo</h2>
            <Link href="/student/library" className="text-xs text-primary hover:underline">Ver todos</Link>
          </div>
          {inProgress.map((enrollment) => (
            <div key={enrollment.id} className="group rounded-lg border border-border bg-card hover:border-primary/30 transition-all duration-200 overflow-hidden">
              <div className="flex items-center gap-4 p-4">
                <div className="relative shrink-0">
                  <img src={enrollment.product?.thumbnail} className="h-14 w-24 rounded object-cover" alt={enrollment.product?.title} />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="h-5 w-5 text-white fill-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <p className="text-sm font-medium text-foreground truncate">{enrollment.product?.title}</p>
                  <Progress value={enrollment.progress} size="sm" variant={enrollment.progress >= 80 ? "success" : "default"} showLabel label={`${enrollment.progress}% concluído`} />
                  <p className="text-xs text-foreground-muted flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Último acesso {enrollment.lastAccessedAt ? formatRelativeDate(enrollment.lastAccessedAt) : "—"}
                  </p>
                </div>
                <Link href="/student/player">
                  <Button size="sm" variant="outline">Continuar</Button>
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Recent notifications & achievements */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Atividade recente</h2>
          <div className="space-y-2">
            {MOCK_NOTIFICATIONS.slice(0, 3).map((n) => (
              <div key={n.id} className={`rounded-lg border p-3 text-sm transition-colors ${!n.isRead ? "border-primary/30 bg-primary/5" : "border-border bg-card"}`}>
                <p className="font-medium text-foreground text-xs leading-snug">{n.title}</p>
                <p className="text-foreground-muted text-xs mt-0.5 line-clamp-2">{n.message}</p>
                <p className="text-foreground-subtle text-2xs mt-1">{formatRelativeDate(n.createdAt)}</p>
              </div>
            ))}
          </div>

          <h2 className="text-sm font-semibold text-foreground pt-2">Conquistas</h2>
          <div className="grid grid-cols-3 gap-2">
            {MOCK_ACHIEVEMENTS.slice(0, 6).map((ach) => (
              <div key={ach.id} title={ach.title} className="flex flex-col items-center gap-1 p-2 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors cursor-pointer">
                <div className="h-8 w-8 rounded-full flex items-center justify-center text-sm" style={{ background: ach.badgeColor + "20", color: ach.badgeColor }}>
                  ★
                </div>
                <p className="text-2xs text-foreground-muted text-center leading-tight">{ach.title}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
