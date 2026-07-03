import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, Award, Flame, Zap, Clock, Play } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUserXp } from "@/lib/gamification";
import { formatRelativeDate } from "@/lib/utils/cn";

export default async function StudentDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = session.user.id;

  const [enrollments, xp, achievements, notifications] = await Promise.all([
    db.enrollment.findMany({
      where: { userId },
      orderBy: { lastAccessedAt: "desc" },
      include: { product: { include: { course: true } } },
    }),
    getUserXp(userId),
    db.userAchievement.findMany({ where: { userId }, include: { achievement: true }, take: 6, orderBy: { unlockedAt: "desc" } }),
    db.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 3 }),
  ]);

  const inProgress = enrollments.filter((e) => e.progress > 0 && e.progress < 100);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-4">
        <Avatar src={session.user.image ?? undefined} name={session.user.name ?? ""} size="lg" status="online" />
        <div>
          <h1 className="text-xl font-semibold text-foreground">Olá, {(session.user.name ?? "").split(" ")[0]}! 👋</h1>
          <p className="text-sm text-foreground-muted">Continue de onde parou.</p>
        </div>
      </div>

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

      <Card>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-foreground">Progresso de nível</p>
          <Badge variant="default">Nível {xp.level}</Badge>
        </div>
        <Progress value={xp.currentLevelXp} max={xp.nextLevelXp} size="md" showLabel label={`${xp.currentLevelXp} / ${xp.nextLevelXp} XP`} />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Continuar aprendendo</h2>
            <Link href="/student/library" className="text-xs text-primary hover:underline">Ver todos</Link>
          </div>
          {inProgress.length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-foreground-muted">
              Você ainda não começou nenhum curso. <Link href="/student/explore" className="text-primary hover:underline">Explorar catálogo</Link>
            </div>
          )}
          {inProgress.map((enrollment) => (
            <div key={enrollment.id} className="group rounded-lg border border-border bg-card hover:border-primary/30 transition-all duration-200 overflow-hidden">
              <div className="flex items-center gap-4 p-4">
                <div className="relative shrink-0">
                  <img src={enrollment.product.thumbnail} className="h-14 w-24 rounded object-cover" alt={enrollment.product.title} />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="h-5 w-5 text-white fill-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <p className="text-sm font-medium text-foreground truncate">{enrollment.product.title}</p>
                  <Progress value={enrollment.progress} size="sm" variant={enrollment.progress >= 80 ? "success" : "default"} showLabel label={`${enrollment.progress}% concluído`} />
                  <p className="text-xs text-foreground-muted flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Último acesso {enrollment.lastAccessedAt ? formatRelativeDate(enrollment.lastAccessedAt.toISOString()) : "—"}
                  </p>
                </div>
                <Link href={enrollment.product.course ? `/student/player?courseId=${enrollment.product.course.id}` : "/student/library"}>
                  <Button size="sm" variant="outline">Continuar</Button>
                </Link>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Atividade recente</h2>
          <div className="space-y-2">
            {notifications.length === 0 && <p className="text-xs text-foreground-muted">Sem novidades por enquanto.</p>}
            {notifications.map((n) => (
              <div key={n.id} className={`rounded-lg border p-3 text-sm transition-colors ${!n.isRead ? "border-primary/30 bg-primary/5" : "border-border bg-card"}`}>
                <p className="font-medium text-foreground text-xs leading-snug">{n.title}</p>
                <p className="text-foreground-muted text-xs mt-0.5 line-clamp-2">{n.message}</p>
                <p className="text-foreground-subtle text-2xs mt-1">{formatRelativeDate(n.createdAt.toISOString())}</p>
              </div>
            ))}
          </div>

          {achievements.length > 0 && (
            <>
              <h2 className="text-sm font-semibold text-foreground pt-2">Conquistas</h2>
              <div className="grid grid-cols-3 gap-2">
                {achievements.map((ua) => (
                  <div key={ua.id} title={ua.achievement.title} className="flex flex-col items-center gap-1 p-2 rounded-lg border border-border bg-card">
                    <div className="h-8 w-8 rounded-full flex items-center justify-center text-sm" style={{ background: ua.achievement.badgeColor + "20", color: ua.achievement.badgeColor }}>★</div>
                    <p className="text-2xs text-foreground-muted text-center leading-tight">{ua.achievement.title}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
