import Link from "next/link";
import { redirect } from "next/navigation";
import { Flame, Zap, Play, Clock, CheckCircle2, Circle, BookOpen } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUserXp, patenteForLevel } from "@/lib/gamification";
import { formatCurrency, formatRelativeDate } from "@/lib/utils/cn";

export default async function StudentDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = session.user.id;

  const [user, enrollments, xp, notifications, favoritesCount, lessonProgressCount] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { name: true, avatar: true, bio: true, phone: true, lastViewedProductId: true } }),
    db.enrollment.findMany({
      where: { userId },
      orderBy: { lastAccessedAt: "desc" },
      include: { product: { include: { course: true, category: true } } },
    }),
    getUserXp(userId),
    db.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 4 }),
    db.favorite.count({ where: { userId } }),
    db.lessonProgress.count({ where: { userId } }),
  ]);

  // ── Curso em destaque = último curso aberto pelo aluno ──────────────────
  let heroProduct =
    user?.lastViewedProductId
      ? await db.product.findFirst({
          where: { id: user.lastViewedProductId, type: "course", status: "published" },
          include: { course: true, category: true },
        })
      : null;
  if (!heroProduct && enrollments[0]) heroProduct = enrollments[0].product;
  if (!heroProduct) {
    heroProduct = await db.product.findFirst({
      where: { type: "course", status: "published" },
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      include: { course: true, category: true },
    });
  }
  const heroEnrollment = heroProduct ? enrollments.find((e) => e.productId === heroProduct!.id) : undefined;

  // ── Saudação + data ─────────────────────────────────────────────────────
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const firstName = (user?.name ?? session.user.name ?? "").split(" ")[0];
  const dateLabel = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" }).toUpperCase();

  const patente = patenteForLevel(xp.level);

  // ── Missões de hoje (derivadas de dados reais) ──────────────────────────
  const profileComplete = Boolean(user?.avatar && (user?.bio || user?.phone));
  const missions = [
    { label: "Assista sua primeira aula", xp: 20, done: lessonProgressCount > 0 },
    { label: "Complete seu perfil", xp: 10, done: profileComplete },
    { label: "Explore o catálogo", xp: 5, done: favoritesCount > 0 || Boolean(user?.lastViewedProductId) },
  ];
  const missionsDone = missions.filter((m) => m.done).length;

  // ── Sequência da semana (seg → dom) ─────────────────────────────────────
  const now = new Date();
  const todayMid = new Date(now); todayMid.setHours(0, 0, 0, 0);
  const dow = (now.getDay() + 6) % 7; // 0 = segunda ... 6 = domingo
  const monday = new Date(todayMid); monday.setDate(todayMid.getDate() - dow);
  const week = ["S", "T", "Q", "Q", "S", "S", "D"].map((letter, i) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i);
    const daysAgo = Math.round((todayMid.getTime() - d.getTime()) / 86400000);
    return { letter, isToday: d.getTime() === todayMid.getTime(), active: d <= todayMid && daysAgo < xp.streak };
  });

  const inProgress = enrollments.filter((e) => e.progress > 0 && e.progress < 100);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Cabeçalho */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-foreground-subtle">{dateLabel}</p>
        <h1 className="mt-1 font-sans text-3xl font-bold text-foreground">{greeting}, {firstName}.</h1>
      </div>

      {/* Curso em destaque */}
      {heroProduct && (
        <div className="relative overflow-hidden rounded-2xl bg-neutral-950 text-white shadow-lg">
          <img src={heroProduct.thumbnail} alt={heroProduct.title} className="absolute inset-0 h-full w-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/75 to-black/30" />

          <div className="relative flex min-h-[240px] flex-col justify-center gap-3 p-6 sm:p-8 lg:max-w-[62%]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-primary px-3 py-1 text-2xs font-bold uppercase tracking-wider">Em destaque</span>
              {heroProduct.category && (
                <span className="text-2xs font-bold uppercase tracking-wider text-white/60">{heroProduct.category.name}</span>
              )}
            </div>
            <h2 className="font-sans text-2xl sm:text-3xl font-extrabold leading-tight">{heroProduct.title}</h2>
            {heroProduct.shortDescription && (
              <p className="max-w-lg text-sm text-white/70">
                {heroProduct.shortDescription}
                {!heroEnrollment && " Comece hoje e ganhe seus primeiros +20 XP."}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-4 pt-1">
              {heroEnrollment && heroProduct.course ? (
                <Link href={`/student/player?courseId=${heroProduct.course.id}`}>
                  <Button leftIcon={<Play className="h-4 w-4 fill-current" />}>Continuar</Button>
                </Link>
              ) : (
                <>
                  <Link href={`/checkout?productId=${heroProduct.id}`}>
                    <Button leftIcon={<Play className="h-4 w-4 fill-current" />}>Começar agora</Button>
                  </Link>
                  <p className="text-sm">
                    <span className="font-bold">{formatCurrency(Number(heroProduct.price))}</span>
                    {heroProduct.comparePrice && (
                      <span className="ml-2 text-white/50 line-through">{formatCurrency(Number(heroProduct.comparePrice))}</span>
                    )}
                  </p>
                </>
              )}
            </div>
          </div>

          <Link
            href={`/course?productId=${heroProduct.id}`}
            aria-label="Ver curso"
            className="absolute right-8 top-1/2 hidden -translate-y-1/2 sm:flex"
          >
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/90 shadow-xl transition-transform hover:scale-105">
              <Play className="h-8 w-8 fill-white text-white ml-1" />
            </span>
          </Link>
        </div>
      )}

      {/* Cards de gamificação */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Nível / patente */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-2xs font-bold uppercase tracking-wider text-foreground-subtle">
              <Zap className="h-3.5 w-3.5 text-primary" /> Nível
            </p>
            <span className="rounded-full border border-primary/30 bg-primary-muted px-2.5 py-0.5 text-2xs font-bold uppercase tracking-wide text-primary">
              {patente.current}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-foreground">{xp.level}</span>
            <span className="text-xs text-foreground-muted">· {xp.currentLevelXp} / {xp.nextLevelXp} XP</span>
          </div>
          <div className="mt-2.5">
            <Progress value={xp.currentLevelXp} max={xp.nextLevelXp} size="sm" />
          </div>
          {patente.next && (
            <p className="mt-2 text-xs text-foreground-muted">Próxima patente: <span className="font-semibold text-foreground">{patente.next}</span></p>
          )}
        </div>

        {/* Sequência */}
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="mb-3 flex items-center justify-between text-2xs font-bold uppercase tracking-wider text-foreground-subtle">
            <span className="flex items-center gap-1.5"><Flame className="h-3.5 w-3.5 text-destructive" /> Sequência</span>
          </p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-extrabold text-foreground">{xp.streak}</span>
            <span className="text-sm text-foreground-muted">dias</span>
          </div>
          <div className="mt-3 flex items-center justify-between">
            {week.map((d, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <div className={[
                  "flex h-7 w-7 items-center justify-center rounded-md text-2xs font-bold",
                  d.active ? "bg-primary text-white" : "bg-muted text-foreground-subtle",
                  d.isToday && !d.active ? "ring-2 ring-primary/50" : "",
                ].join(" ")}>
                  {d.active ? <Flame className="h-3.5 w-3.5" /> : ""}
                </div>
                <span className={`text-2xs ${d.isToday ? "font-bold text-primary" : "text-foreground-subtle"}`}>{d.letter}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Missões de hoje */}
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="mb-3 flex items-center justify-between text-2xs font-bold uppercase tracking-wider text-foreground-subtle">
            <span>Missões de hoje</span>
            <span className="text-foreground-muted">{missionsDone}/{missions.length}</span>
          </p>
          <div className="space-y-2.5">
            {missions.map((m) => (
              <div key={m.label} className="flex items-center gap-2.5">
                {m.done ? <CheckCircle2 className="h-4 w-4 shrink-0 text-success" /> : <Circle className="h-4 w-4 shrink-0 text-border" />}
                <span className={`flex-1 text-sm ${m.done ? "text-foreground-muted line-through" : "text-foreground"}`}>{m.label}</span>
                <span className="text-xs font-bold text-primary">+{m.xp}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Continuar aprendendo + Atividade recente */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-sans text-lg font-bold text-foreground">Continuar aprendendo</h2>
            {inProgress.length > 0 && <Link href="/student/library" className="text-xs text-primary hover:underline">Ver todos</Link>}
          </div>
          {inProgress.length === 0 ? (
            <div className="flex items-center gap-3 rounded-xl border border-dashed border-border p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-muted">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Nenhum curso iniciado</p>
                <p className="text-xs text-foreground-muted">Seu progresso e a próxima aula aparecerão aqui.</p>
              </div>
            </div>
          ) : (
            inProgress.map((enrollment) => (
              <div key={enrollment.id} className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30">
                <img src={enrollment.product.thumbnail} className="h-14 w-24 shrink-0 rounded object-cover" alt={enrollment.product.title} />
                <div className="min-w-0 flex-1 space-y-2">
                  <p className="truncate text-sm font-medium text-foreground">{enrollment.product.title}</p>
                  <Progress value={enrollment.progress} size="sm" variant={enrollment.progress >= 80 ? "success" : "default"} showLabel label={`${enrollment.progress}% concluído`} />
                </div>
                <Link href={enrollment.product.course ? `/student/player?courseId=${enrollment.product.course.id}` : "/student/library"}>
                  <Button size="sm" variant="outline">Continuar</Button>
                </Link>
              </div>
            ))
          )}
        </div>

        <div className="space-y-3">
          <h2 className="font-sans text-lg font-bold text-foreground">Atividade recente</h2>
          {notifications.length === 0 ? (
            <div className="flex items-center gap-3 rounded-xl border border-dashed border-border p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Clock className="h-5 w-5 text-foreground-muted" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Sem novidades por enquanto</p>
                <p className="text-xs text-foreground-muted">Aulas, XP e conquistas formarão sua linha do tempo.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((n) => (
                <div key={n.id} className={`rounded-xl border p-3 ${!n.isRead ? "border-primary/30 bg-primary/5" : "border-border bg-card"}`}>
                  <p className="text-xs font-medium leading-snug text-foreground">{n.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-foreground-muted">{n.message}</p>
                  <p className="mt-1 text-2xs text-foreground-subtle">{formatRelativeDate(n.createdAt.toISOString())}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
