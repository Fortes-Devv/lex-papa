import { db } from "@/lib/db";

// Seções do curso que são só uma lista de aulas, sem módulos (Mentoria, Simulados):
// um módulo oculto por curso (course_modules.section = id da seção). Não aparecem em
// "Aulas e Materiais", não contam no progresso nem nos totais. A Mentoria abre
// MENTORIA_RELEASE_DAYS após a compra (ver release.ts); os Simulados, na hora.
// Fora de "use server" de propósito: helper interno, não endpoint.

export const LIST_SECTIONS = {
  mentoria: { title: "Mentoria", item: "aula", items: "aulas", heading: "Aulas de mentoria" },
  simulados: { title: "Simulados", item: "simulado", items: "simulados", heading: "Simulados em PDF" },
} as const;
export type ListSection = keyof typeof LIST_SECTIONS;

export const isListSection = (s: string): s is ListSection => s in LIST_SECTIONS;

export async function findSectionModuleId(courseId: string, section: ListSection) {
  const link = await db.courseModule.findFirst({ where: { courseId, section }, orderBy: { addedAt: "asc" }, select: { moduleId: true } });
  return link?.moduleId ?? null;
}

// Cria na primeira vez que a equipe abre a seção.
export async function ensureSectionModule(courseId: string, section: ListSection) {
  const existing = await findSectionModuleId(courseId, section);
  if (existing) return existing;
  const mod = await db.module.create({
    data: { title: LIST_SECTIONS[section].title, courses: { create: { courseId, section, isPublished: true, order: 0 } } },
  });
  return mod.id;
}
