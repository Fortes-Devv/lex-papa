import { db } from "@/lib/db";

// Mentoria do curso: um módulo oculto (course_modules.section = "mentoria") que é só
// uma lista de aulas. Não aparece em "Aulas e Materiais", não conta no progresso e
// abre MENTORIA_RELEASE_DAYS após a compra (ver release.ts).
// Fora de "use server" de propósito: helper interno, não endpoint.

export async function findMentoriaModuleId(courseId: string) {
  const link = await db.courseModule.findFirst({ where: { courseId, section: "mentoria" }, orderBy: { addedAt: "asc" }, select: { moduleId: true } });
  return link?.moduleId ?? null;
}

// Cria na primeira vez que a equipe abre a seção.
export async function ensureMentoriaModule(courseId: string) {
  const existing = await findMentoriaModuleId(courseId);
  if (existing) return existing;
  const mod = await db.module.create({
    data: { title: "Mentoria", courses: { create: { courseId, section: "mentoria", isPublished: true, order: 0 } } },
  });
  return mod.id;
}
