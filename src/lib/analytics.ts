import { db } from "@/lib/db";
import type { AnalyticsMetric, RevenueDataPoint } from "@/lib/types";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return startOfDay(d);
}
function fmtDate(d: Date) {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}
function pctChange(curr: number, prev: number) {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return Math.round(((curr - prev) / prev) * 1000) / 10;
}
function trendOf(curr: number, prev: number): "up" | "down" | "neutral" {
  if (curr === prev) return "neutral";
  return curr > prev ? "up" : "down";
}

export async function getRevenueSeries(days = 30): Promise<RevenueDataPoint[]> {
  const since = daysAgo(days - 1);
  const orders = await db.order.findMany({
    where: { createdAt: { gte: since }, status: { in: ["paid", "refunded"] } },
    select: { total: true, status: true, createdAt: true, paidAt: true },
  });

  const buckets = new Map<string, RevenueDataPoint>();
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    buckets.set(d.toISOString().slice(0, 10), { date: fmtDate(d), revenue: 0, orders: 0, refunds: 0 });
  }
  for (const o of orders) {
    const key = (o.paidAt ?? o.createdAt).toISOString().slice(0, 10);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    if (o.status === "paid") {
      bucket.revenue += Number(o.total);
      bucket.orders += 1;
    } else if (o.status === "refunded") {
      bucket.refunds += Number(o.total);
    }
  }
  return Array.from(buckets.values());
}

// Consultas sequenciais (não Promise.all) — o driver HTTP da Neon rejeita
// rajadas grandes de requisições simultâneas. Esta função só roda no
// dashboard admin, então a latência extra é irrelevante.
async function periodStats(start: Date, end: Date) {
  const revenueAgg = await db.order.aggregate({ _sum: { total: true }, where: { status: "paid", paidAt: { gte: start, lte: end } } });
  const newStudents = await db.user.count({ where: { role: "student", createdAt: { gte: start, lte: end } } });
  const activeEnrollments = await db.enrollment.count({ where: { status: "active", enrolledAt: { gte: start, lte: end } } });
  const progressAgg = await db.enrollment.aggregate({ _avg: { progress: true }, where: { enrolledAt: { lte: end } } });
  const refundedAgg = await db.order.aggregate({ _sum: { total: true }, where: { status: "refunded", updatedAt: { gte: start, lte: end } } });
  const paidCount = await db.order.count({ where: { status: "paid", paidAt: { gte: start, lte: end } } });

  const revenue = Number(revenueAgg._sum.total ?? 0);
  const refunded = Number(refundedAgg._sum.total ?? 0);
  return {
    revenue,
    newStudents,
    activeEnrollments,
    completionRate: progressAgg._avg.progress ?? 0,
    avgTicket: paidCount > 0 ? revenue / paidCount : 0,
    refundRate: revenue + refunded > 0 ? (refunded / (revenue + refunded)) * 100 : 0,
  };
}

export async function getDashboardMetrics(): Promise<AnalyticsMetric[]> {
  const now = new Date();
  const current = await periodStats(daysAgo(29), now);
  const previous = await periodStats(daysAgo(59), daysAgo(30));

  const rows: { label: string; curr: number; prev: number }[] = [
    { label: "Receita Total", curr: current.revenue, prev: previous.revenue },
    { label: "Novos Alunos", curr: current.newStudents, prev: previous.newStudents },
    { label: "Matrículas Ativas", curr: current.activeEnrollments, prev: previous.activeEnrollments },
    { label: "Taxa de Conclusão", curr: current.completionRate, prev: previous.completionRate },
    { label: "Ticket Médio", curr: current.avgTicket, prev: previous.avgTicket },
    { label: "Reembolsos", curr: current.refundRate, prev: previous.refundRate },
  ];

  return rows.map((r) => ({
    label: r.label,
    value: r.curr,
    change: pctChange(r.curr, r.prev),
    trend: trendOf(r.curr, r.prev),
  }));
}

export async function getFinancialSummary() {
  const [paid, pending, refunded, chargeback] = await Promise.all([
    db.order.aggregate({ _sum: { total: true }, where: { status: "paid" } }),
    db.order.aggregate({ _sum: { total: true }, where: { status: "pending" } }),
    db.order.aggregate({ _sum: { total: true }, where: { status: "refunded" } }),
    db.order.aggregate({ _sum: { total: true }, where: { status: "chargeback" } }),
  ]);
  return {
    confirmed: Number(paid._sum.total ?? 0),
    pending: Number(pending._sum.total ?? 0),
    refunded: Number(refunded._sum.total ?? 0),
    chargebacks: Number(chargeback._sum.total ?? 0),
  };
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  credit_card: "Cartão de Crédito",
  debit_card: "Cartão de Débito",
  pix: "PIX",
  boleto: "Boleto",
  paypal: "PayPal",
};
const PAYMENT_METHOD_COLORS: Record<string, string> = {
  credit_card: "#5E6AD2",
  debit_card: "#818CF8",
  pix: "#10B981",
  boleto: "#F59E0B",
  paypal: "#3B82F6",
};

export async function getPaymentMethodBreakdown() {
  const grouped = await db.order.groupBy({
    by: ["paymentMethod"],
    where: { status: "paid", paymentMethod: { not: null } },
    _count: { _all: true },
  });
  const total = grouped.reduce((s, g) => s + g._count._all, 0);
  return grouped
    .filter((g) => g.paymentMethod)
    .map((g) => ({
      name: PAYMENT_METHOD_LABELS[g.paymentMethod as string] ?? g.paymentMethod!,
      value: total > 0 ? Math.round((g._count._all / total) * 100) : 0,
      color: PAYMENT_METHOD_COLORS[g.paymentMethod as string] ?? "#94A3B8",
    }));
}

export async function getOverviewStats() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [totalStudents, newStudentsThisMonth, publishedCourses, newCoursesThisMonth, revenueThisMonth, revenuePrevMonth, completionAgg, completionPrevAgg] = await Promise.all([
    db.user.count({ where: { role: "student" } }),
    db.user.count({ where: { role: "student", createdAt: { gte: monthStart } } }),
    db.product.count({ where: { type: "course", status: "published" } }),
    db.product.count({ where: { type: "course", status: "published", publishedAt: { gte: monthStart } } }),
    db.order.aggregate({ _sum: { total: true }, where: { status: "paid", paidAt: { gte: monthStart } } }),
    db.order.aggregate({ _sum: { total: true }, where: { status: "paid", paidAt: { gte: prevMonthStart, lt: monthStart } } }),
    db.enrollment.aggregate({ _avg: { progress: true } }),
    db.enrollment.aggregate({ _avg: { progress: true }, where: { enrolledAt: { lt: monthStart } } }),
  ]);

  const revenue = Number(revenueThisMonth._sum.total ?? 0);
  const prevRevenue = Number(revenuePrevMonth._sum.total ?? 0);
  const completionRate = completionAgg._avg.progress ?? 0;
  const prevCompletionRate = completionPrevAgg._avg.progress ?? 0;

  return {
    totalStudents,
    newStudentsThisMonth,
    publishedCourses,
    newCoursesThisMonth,
    revenue,
    revenueChange: pctChange(revenue, prevRevenue),
    completionRate,
    completionChange: pctChange(completionRate, prevCompletionRate),
  };
}

export async function getTeacherRevenueSeries(teacherId: string, days = 30): Promise<RevenueDataPoint[]> {
  const since = daysAgo(days - 1);
  const orders = await db.order.findMany({
    where: {
      status: { in: ["paid", "refunded"] },
      createdAt: { gte: since },
      items: { some: { product: { instructors: { some: { id: teacherId } } } } },
    },
    select: { total: true, status: true, createdAt: true, paidAt: true },
  });

  const buckets = new Map<string, RevenueDataPoint>();
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    buckets.set(d.toISOString().slice(0, 10), { date: fmtDate(d), revenue: 0, orders: 0, refunds: 0 });
  }
  for (const o of orders) {
    const key = (o.paidAt ?? o.createdAt).toISOString().slice(0, 10);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    if (o.status === "paid") { bucket.revenue += Number(o.total); bucket.orders += 1; }
    else if (o.status === "refunded") bucket.refunds += Number(o.total);
  }
  return Array.from(buckets.values());
}

export async function getTeacherOverview(teacherId: string) {
  const products = await db.product.findMany({
    where: { type: "course", instructors: { some: { id: teacherId } } },
    select: { id: true, status: true, rating: true, enrolledCount: true },
  });
  const productIds = products.map((p) => p.id);

  const revenueAgg = await db.orderItem.aggregate({
    _sum: { totalPrice: true },
    where: { productId: { in: productIds }, order: { status: "paid" } },
  });
  const ratedCourses = products.filter((p) => p.rating > 0);
  const avgRating = ratedCourses.length > 0 ? ratedCourses.reduce((s, p) => s + p.rating, 0) / ratedCourses.length : 0;

  return {
    totalStudents: products.reduce((s, p) => s + p.enrolledCount, 0),
    totalRevenue: Number(revenueAgg._sum.totalPrice ?? 0),
    publishedCourses: products.filter((p) => p.status === "published").length,
    avgRating,
  };
}

export async function getCourseAnalyticsList(limit?: number, teacherId?: string) {
  const products = await db.product.findMany({
    where: {
      type: "course",
      ...(teacherId ? { instructors: { some: { id: teacherId } } } : {}),
    },
    orderBy: { enrolledCount: "desc" },
    take: limit,
    include: { course: true },
  });

  return Promise.all(
    products.map(async (p) => {
      const [enrollmentAgg, revenueAgg, watchAgg, completions] = await Promise.all([
        db.enrollment.aggregate({ _avg: { progress: true }, _count: { _all: true }, where: { productId: p.id } }),
        db.orderItem.aggregate({ _sum: { totalPrice: true }, where: { productId: p.id, order: { status: "paid" } } }),
        p.course
          ? db.lessonProgress.aggregate({ _sum: { watchedSeconds: true }, where: { lesson: { module: { courseId: p.course.id } } } })
          : Promise.resolve({ _sum: { watchedSeconds: 0 } }),
        db.enrollment.count({ where: { productId: p.id, status: "completed" } }),
      ]);
      return {
        productId: p.id,
        title: p.title,
        thumbnail: p.thumbnail,
        enrollments: enrollmentAgg._count._all,
        completions,
        completionRate: enrollmentAgg._avg.progress ?? 0,
        avgRating: p.rating,
        revenue: Number(revenueAgg._sum.totalPrice ?? 0),
        watchTimeHours: Math.round((watchAgg._sum.watchedSeconds ?? 0) / 3600),
      };
    })
  );
}
