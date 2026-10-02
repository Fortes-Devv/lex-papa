"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth-guards";
import { db } from "@/lib/db";
import { canEditLesson, NOT_ALLOWED } from "@/lib/course-permissions";

// Materiais (PDFs) anexados a uma aula: o aluno baixa embaixo do vídeo.
// O arquivo fica no Cloudinary; reaproveitar um PDF existente só cria outro
// vínculo com a mesma URL (nada é reenviado nem duplicado).

const isCloudinaryUrl = (url: string) => url.startsWith("https://res.cloudinary.com/");

function revalidateMaterials() {
  revalidatePath("/admin/courses", "layout");
  revalidatePath("/teacher/content");
  revalidatePath("/student/player");
}

export async function addLessonMaterial(lessonId: string, input: { title: string; url: string }) {
  const session = await requireStaff();
  if (!(await canEditLesson(session.user, lessonId))) return NOT_ALLOWED;
  const title = input.title.trim().slice(0, 150);
  if (!title) return { success: false as const, error: "Dê um nome ao material." };
  if (!isCloudinaryUrl(input.url)) return { success: false as const, error: "Arquivo inválido." };

  const material = await db.material.create({ data: { lessonId, title, type: "pdf", url: input.url } });
  revalidateMaterials();
  return { success: true as const, material: { id: material.id, title: material.title, url: material.url } };
}

export async function removeLessonMaterial(materialId: string) {
  const session = await requireStaff();
  const material = await db.material.findUnique({ where: { id: materialId }, select: { lessonId: true } });
  if (!material) return { success: false as const, error: "Material não encontrado." };
  if (!(await canEditLesson(session.user, material.lessonId))) return NOT_ALLOWED;
  // Só desfaz o vínculo: o arquivo pode estar em outras aulas (ou no módulo de PDFs).
  await db.material.delete({ where: { id: materialId } });
  revalidateMaterials();
  return { success: true as const };
}

export async function renameLessonMaterial(materialId: string, title: string) {
  const session = await requireStaff();
  const material = await db.material.findUnique({ where: { id: materialId }, select: { lessonId: true } });
  if (!material) return { success: false as const, error: "Material não encontrado." };
  if (!(await canEditLesson(session.user, material.lessonId))) return NOT_ALLOWED;
  const clean = title.trim().slice(0, 150);
  if (!clean) return { success: false as const, error: "Dê um nome ao material." };
  await db.material.update({ where: { id: materialId }, data: { title: clean } });
  revalidateMaterials();
  return { success: true as const };
}

// PDFs que já existem na plataforma para reaproveitar: aulas do tipo PDF (ex.: o
// módulo "Mapas Mentais") e materiais já anexados. Sem duplicar a mesma URL.
export async function listReusablePdfs(search = "") {
  await requireStaff();
  const q = search.trim();
  const titleFilter = q ? { contains: q, mode: "insensitive" as const } : undefined;

  const [lessons, materials] = [
    await db.lesson.findMany({
      where: { pdfUrl: { not: null }, ...(titleFilter ? { title: titleFilter } : {}) },
      select: { title: true, pdfUrl: true, module: { select: { title: true } } },
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
    await db.material.findMany({
      where: { type: "pdf", ...(titleFilter ? { title: titleFilter } : {}) },
      select: { title: true, url: true, lesson: { select: { title: true, module: { select: { title: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ];

  const seen = new Set<string>();
  const out: { title: string; url: string; source: string }[] = [];
  for (const l of lessons) {
    if (!l.pdfUrl || seen.has(l.pdfUrl)) continue;
    seen.add(l.pdfUrl);
    out.push({ title: l.title, url: l.pdfUrl, source: `Módulo ${l.module.title}` });
  }
  for (const m of materials) {
    if (seen.has(m.url)) continue;
    seen.add(m.url);
    out.push({ title: m.title, url: m.url, source: `Anexo em "${m.lesson.title}" · ${m.lesson.module.title}` });
  }
  return out.slice(0, 50);
}
