import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { periodRange, type DashboardPeriod } from "@/lib/dashboard";
import { financeRange, getFinanceData, type FinancePeriod } from "@/lib/financial";
import { getCourseEngagement } from "@/lib/engagement";

// Exportações em CSV dos botões "Exportar" do admin.
// GET /api/admin/export?tipo=dashboard|financeiro|analytics|logs (+ os mesmos filtros da página)

const cell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
const csv = (rows: unknown[][]) => "﻿" + rows.map((r) => r.map(cell).join(";")).join("\r\n"); // ; + BOM: abre direto no Excel pt-BR
const money = (n: number) => n.toFixed(2).replace(".", ",");
const date = (d: Date | null) => (d ? d.toLocaleString("pt-BR", { timeZone: "America/Fortaleza" }) : "");

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "admin" && session.user.role !== "moderator")) {
    return new NextResponse("Não autorizado.", { status: 403 });
  }
  const p = new URL(request.url).searchParams;
  const tipo = p.get("tipo");
  let rows: unknown[][];

  if (tipo === "dashboard") {
    const period = (["hoje", "7d", "30d", "ano"].includes(p.get("periodo") ?? "") ? p.get("periodo") : "7d") as DashboardPeriod;
    const { start, end } = periodRange(period);
    const orders = await db.order.findMany({
      where: { createdAt: { gte: start, lte: end } }, orderBy: { createdAt: "desc" },
      select: { id: true, createdAt: true, status: true, total: true, paymentMethod: true, user: { select: { name: true, email: true } }, items: { take: 1, select: { product: { select: { title: true } } } } },
    });
    rows = [["Pedido", "Data", "Aluno", "E-mail", "Produto", "Pagamento", "Status", "Valor (R$)"],
      ...orders.map((o) => [o.id, date(o.createdAt), o.user.name, o.user.email, o.items[0]?.product.title ?? "", o.paymentMethod ?? "", o.status, money(Number(o.total))])];
  } else if (tipo === "financeiro") {
    const period = (["atual", "anterior", "ano"].includes(p.get("mes") ?? "") ? p.get("mes") : "atual") as FinancePeriod;
    const r = financeRange(period);
    const d = await getFinanceData(period);
    const paid = await db.order.findMany({
      where: { status: "paid", paidAt: { gte: r.start, lt: r.end } }, orderBy: { paidAt: "asc" },
      select: { id: true, paidAt: true, total: true, paymentMethod: true, couponCode: true, user: { select: { name: true } } },
    });
    rows = [["Resumo", r.label], ["Receita bruta (R$)", money(d.gross)], ["Taxas estimadas (R$)", money(d.fees)], ["Reembolsos (R$)", money(d.refunded)], ["Líquido (R$)", money(d.net)], [],
      ["Pedido", "Pago em", "Aluno", "Pagamento", "Cupom", "Valor (R$)"],
      ...paid.map((o) => [o.id, date(o.paidAt), o.user.name, o.paymentMethod ?? "", o.couponCode ?? "", money(Number(o.total))])];
  } else if (tipo === "analytics") {
    const courseId = p.get("curso");
    if (!courseId) return new NextResponse("Informe o curso.", { status: 400 });
    const days = p.get("dias") === "7" ? 7 : 30;
    const e = await getCourseEngagement(courseId, days);
    rows = [["Módulo", "Professor", "Aulas", "Alunos", "Conclusão (%)", "Tempo médio (min)", "Abandono (%)"],
      ...e.modules.map((m) => [m.title, m.instructor ?? "", m.lessons, m.students, m.completion, m.avgMinutes, m.abandonment])];
  } else if (tipo === "logs") {
    const logs = await db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 2000, include: { actor: { select: { name: true } } } });
    rows = [["Data", "Ação", "Recurso", "ID", "Por", "IP", "Detalhes"],
      ...logs.map((l) => [date(l.createdAt), l.action, l.resourceType, l.resourceId ?? "", l.actor?.name ?? "Sistema", l.ipAddress ?? "", l.metadata ? JSON.stringify(l.metadata) : ""])];
  } else {
    return new NextResponse("Tipo de exportação inválido.", { status: 400 });
  }

  const name = `lex-${tipo}-${new Date().toISOString().slice(0, 10)}.csv`;
  return new NextResponse(csv(rows), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "no-store" },
  });
}
