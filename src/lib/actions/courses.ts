"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth-guards";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils/cn";
import { deleteBunnyVideo } from "@/lib/bunny";
import { deleteCloudinaryImageByUrl } from "@/lib/cloudinary";
import { canEditCourse, canEditLesson, canEditModule, canEditProduct, NOT_ALLOWED } from "@/lib/course-permissions";
import { courseLessonsWhere } from "@/lib/lesson-access";
import type { LessonType, ProductLevel, Lesson } from "@/lib/types";

type CompletionCriteria = Lesson["completionCriteria"];
type VideoProvider = NonNullable<Lesson["videoProvider"]>;

async function findOrCreateCategory(name: string) {
  const slug = slugify(name);
  const existing = await db.category.findUnique({ where: { slug } });
  if (existing) return existing;
  return db.category.create({ data: { name, slug } });
}

async function uniqueSlug(title: string) {
  const base = slugify(title);
  let slug = base;
  let n = 1;
  while (await db.product.findUnique({ where: { slug } })) {
    slug = `${base}-${++n}`;
  }
  return slug;
}

export async function createCourse(input: {
  title: string;
  shortDescription: string;
  description: string;
  price: number;
  comparePrice?: number;
  categoryName: string;
  level: ProductLevel;
  thumbnail: string;
  heroColor?: string;
}) {
  const session = await requireStaff();

  if (!Number.isFinite(input.price) || input.price <= 0) {
    return { success: false as const, error: "Informe um preço válido maior que zero (ex: 297,00)." };
  }

  const category = await findOrCreateCategory(input.categoryName);
  const slug = await uniqueSlug(input.title);

  const product = await db.product.create({
    data: {
      type: "course",
      status: "draft",
      title: input.title,
      slug,
      shortDescription: input.shortDescription,
      description: input.description,
      // Sem capa enviada, usa o logo (antes: foto de demonstração do Unsplash).
      thumbnail: input.thumbnail || "/logo.png",
      price: input.price,
      comparePrice: input.comparePrice,
      level: input.level,
      categoryId: category.id,
      instructors: { connect: [{ id: session.user.id }] },
      course: { create: { heroColor: input.heroColor ?? "navy" } },
    },
    include: { course: true },
  });

  revalidatePath("/admin/courses");
  revalidatePath("/teacher/courses");
  return { success: true as const, productId: product.id, courseId: product.course!.id };
}

export async function updateCourseDetails(productId: string, input: {
  title: string;
  shortDescription: string;
  description: string;
  price: number;
  comparePrice?: number;
  categoryName: string;
  level: ProductLevel;
  thumbnail: string;
  heroColor?: string;
}) {
  const session = await requireStaff();
  if (!(await canEditProduct(session.user, productId))) return NOT_ALLOWED;
  if (!input.title.trim()) return { success: false as const, error: "Título obrigatório." };
  if (!Number.isFinite(input.price) || input.price <= 0) {
    return { success: false as const, error: "Informe um preço válido maior que zero (ex: 297,00)." };
  }

  const category = await findOrCreateCategory(input.categoryName);

  // Se a capa foi trocada, remove a antiga do Cloudinary.
  if (input.thumbnail) {
    const current = await db.product.findUnique({ where: { id: productId }, select: { thumbnail: true } });
    if (current?.thumbnail && current.thumbnail !== input.thumbnail) {
      await deleteCloudinaryImageByUrl(current.thumbnail);
    }
  }

  await db.product.update({
    where: { id: productId },
    data: {
      title: input.title,
      shortDescription: input.shortDescription,
      description: input.description || input.shortDescription,
      price: input.price,
      comparePrice: input.comparePrice ?? null,
      level: input.level,
      categoryId: category.id,
      ...(input.thumbnail ? { thumbnail: input.thumbnail } : {}),
      ...(input.heroColor ? { course: { update: { heroColor: input.heroColor } } } : {}),
    },
  });

  revalidatePath("/admin/courses");
  revalidatePath("/teacher/courses");
  revalidatePath("/admin/products");
  return { success: true as const };
}

export async function deleteCourse(productId: string) {
  const session = await requireStaff();

  const product = await db.product.findUnique({
    where: { id: productId },
    include: { _count: { select: { orderItems: true, enrollments: true } } },
  });
  if (!product) return { success: false as const, error: "Curso não encontrado." };

  // Professor só pode excluir os próprios cursos.
  if (!(await canEditProduct(session.user, productId))) {
    return { success: false as const, error: "Você só pode excluir os próprios cursos." };
  }

  // Proteção: não excluir curso com vendas ou matrículas (preserva histórico e acesso).
  if (product._count.orderItems > 0 || product._count.enrollments > 0) {
    return {
      success: false as const,
      error: "Este curso já tem pedidos ou alunos matriculados. Em vez de excluir, despublique-o.",
    };
  }

  // Cascade remove o curso e as ligações com módulos. Os MÓDULOS (aulas e vídeos)
  // são preservados: podem estar em outros cursos ou ser reaproveitados depois.
  // Para apagar um módulo de vez, use deleteModule (só quando nenhum curso o usa).
  await db.product.delete({ where: { id: productId } });

  // Limpeza externa: capa no Cloudinary.
  await deleteCloudinaryImageByUrl(product.thumbnail);

  const { logAudit } = await import("@/lib/audit");
  await logAudit({ actorId: session.user.id, action: "product.deleted", resourceType: "product", resourceId: productId, metadata: { title: product.title } });

  revalidatePath("/admin/courses");
  revalidatePath("/teacher/courses");
  revalidatePath("/admin/products");
  return { success: true as const };
}

export async function updateCourseThumbnail(productId: string, thumbnail: string) {
  const session = await requireStaff();
  if (!(await canEditProduct(session.user, productId))) return NOT_ALLOWED;
  await db.product.update({ where: { id: productId }, data: { thumbnail } });
  revalidatePath("/admin/courses");
  revalidatePath("/teacher/courses");
  return { success: true as const };
}

export async function updateCourseStatus(productId: string, status: "draft" | "published") {
  const session = await requireStaff();
  if (!(await canEditProduct(session.user, productId))) return NOT_ALLOWED;
  await db.product.update({
    where: { id: productId },
    data: { status, publishedAt: status === "published" ? new Date() : null },
  });
  revalidatePath("/admin/courses");
  revalidatePath("/teacher/courses");
  return { success: true as const };
}

// ── Módulos ───────────────────────────────────────────────────────────────
// Um módulo pode estar em vários cursos (CourseModule). Estrutura do curso
// (adicionar/remover/ordenar/publicar módulo no curso) = canEditCourse.
// Conteúdo do módulo (título, capa, aulas, quiz) = canEditModule (dono + admin).

function revalidateContent() {
  revalidatePath("/admin/courses");
  revalidatePath("/teacher/content");
  revalidatePath("/teacher/modules");
  revalidatePath("/teacher/dashboard");
}

async function nextModuleOrder(courseId: string) {
  const last = await db.courseModule.findFirst({ where: { courseId }, orderBy: { order: "desc" } });
  return (last?.order ?? 0) + 1;
}

export async function createModule(courseId: string, title: string, instructorId?: string | null, coverImage?: string | null) {
  const session = await requireStaff();
  if (!(await canEditCourse(session.user, courseId))) return NOT_ALLOWED;
  if (!title.trim()) return { success: false as const, error: "Dê um título para o módulo." };
  // Professor que cria o módulo é o dono dele; admin/moderador escolhe o professor.
  const owner = session.user.role === "teacher" ? session.user.id : instructorId || null;
  const mod = await db.module.create({
    data: {
      title,
      instructorId: owner,
      coverImage: coverImage || null,
      courses: { create: { courseId, order: await nextModuleOrder(courseId) } },
    },
  });
  revalidateContent();
  return { success: true as const, moduleId: mod.id };
}

// Módulos existentes que podem ser adicionados a este curso (ainda não estão nele).
export async function listAttachableModules(courseId: string, search = "") {
  const session = await requireStaff();
  if (!(await canEditCourse(session.user, courseId))) return [];
  const modules = await db.module.findMany({
    where: {
      courses: { none: { courseId } },
      ...(search.trim() ? { title: { contains: search.trim(), mode: "insensitive" as const } } : {}),
    },
    orderBy: { title: "asc" },
    take: 50,
    include: {
      instructor: { select: { name: true } },
      _count: { select: { lessons: true } },
      courses: { select: { course: { select: { product: { select: { title: true } } } } } },
    },
  });
  return modules.map((m) => ({
    id: m.id,
    title: m.title,
    instructorName: m.instructor?.name ?? null,
    lessonCount: m._count.lessons,
    usedIn: m.courses.map((c) => c.course.product.title),
  }));
}

// Reaproveita um módulo existente neste curso (as aulas não são copiadas).
export async function attachModule(courseId: string, moduleId: string) {
  const session = await requireStaff();
  if (!(await canEditCourse(session.user, courseId))) return NOT_ALLOWED;
  const exists = await db.module.count({ where: { id: moduleId } });
  if (!exists) return { success: false as const, error: "Módulo não encontrado." };
  const already = await db.courseModule.count({ where: { courseId, moduleId } });
  if (already) return { success: false as const, error: "Este módulo já está no curso." };
  await db.courseModule.create({ data: { courseId, moduleId, order: await nextModuleOrder(courseId) } });
  await recalcCourseTotals(courseId);
  revalidateContent();
  return { success: true as const };
}

// Tira o módulo do curso. O módulo e as aulas continuam existindo (podem estar
// em outros cursos ou ser reaproveitados depois). `orphan` = não está em mais nenhum curso.
export async function detachModule(courseId: string, moduleId: string) {
  const session = await requireStaff();
  if (!(await canEditCourse(session.user, courseId))) return NOT_ALLOWED;
  await db.courseModule.deleteMany({ where: { courseId, moduleId } });
  await recalcCourseTotals(courseId);
  const remaining = await db.courseModule.count({ where: { moduleId } });
  const canDelete = remaining === 0 && (await canEditModule(session.user, moduleId));
  revalidateContent();
  return { success: true as const, orphan: remaining === 0, canDelete };
}

export async function renameModule(moduleId: string, title: string, instructorId?: string | null, coverImage?: string | null) {
  const session = await requireStaff();
  if (!(await canEditModule(session.user, moduleId))) return NOT_ALLOWED;
  if (!title.trim()) return { success: false as const, error: "Dê um título para o módulo." };
  // Trocar o dono do módulo é só para admin/moderador.
  const canReassign = session.user.role === "admin" || session.user.role === "moderator";
  // Se a capa foi trocada, remove a antiga do Cloudinary.
  if (coverImage !== undefined) {
    const current = await db.module.findUnique({ where: { id: moduleId }, select: { coverImage: true } });
    if (current?.coverImage && current.coverImage !== coverImage) {
      await deleteCloudinaryImageByUrl(current.coverImage);
    }
  }
  await db.module.update({
    where: { id: moduleId },
    // undefined = não mexe; null/string = define/remove
    data: {
      title,
      ...(instructorId === undefined || !canReassign ? {} : { instructorId: instructorId || null }),
      ...(coverImage === undefined ? {} : { coverImage: coverImage || null }),
    },
  });
  revalidateContent();
  return { success: true as const };
}

// Lista os professores/staff disponíveis para associar a um módulo.
export async function listTeachers() {
  await requireStaff();
  return db.user.findMany({
    where: { role: { in: ["teacher", "moderator", "admin"] }, status: "active" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

// Publica/despublica o módulo NESTE curso (não afeta os outros cursos).
export async function toggleModulePublished(courseId: string, moduleId: string, isPublished: boolean) {
  const session = await requireStaff();
  if (!(await canEditCourse(session.user, courseId))) return NOT_ALLOWED;
  await db.courseModule.updateMany({ where: { courseId, moduleId }, data: { isPublished } });
  await recalcCourseTotals(courseId);
  revalidateContent();
  return { success: true as const };
}

// Publica o módulo neste curso E todas as suas aulas (aulas valem para todos os
// cursos, então só quem edita o módulo publica as aulas). Despublicar só tira
// o módulo deste curso, sem despublicar as aulas nos outros.
export async function setModulePublished(courseId: string, moduleId: string, publish: boolean) {
  const session = await requireStaff();
  if (!(await canEditCourse(session.user, courseId))) return NOT_ALLOWED;
  await db.courseModule.updateMany({ where: { courseId, moduleId }, data: { isPublished: publish } });
  if (publish && (await canEditModule(session.user, moduleId))) {
    await db.lesson.updateMany({ where: { moduleId }, data: { status: "published" } });
  }
  await recalcTotalsForModule(moduleId);
  revalidateContent();
  return { success: true as const };
}

// Exclui o módulo de vez (aulas e vídeos). Só é permitido quando nenhum curso usa
// o módulo — evita apagar sem querer o conteúdo de outros cursos.
export async function deleteModule(moduleId: string) {
  const session = await requireStaff();
  if (!(await canEditModule(session.user, moduleId))) return NOT_ALLOWED;
  const usedIn = await db.courseModule.count({ where: { moduleId } });
  if (usedIn > 0) {
    return { success: false as const, error: `Este módulo ainda está em ${usedIn} curso(s). Remova-o dos cursos antes de excluir.` };
  }
  // Coleta os vídeos Bunny das aulas e a capa antes de excluir o módulo (cascade).
  const lessons = await db.lesson.findMany({
    where: { moduleId, videoProvider: "bunny", videoPublicId: { not: null } },
    select: { videoPublicId: true },
  });
  const mod = await db.module.findUnique({ where: { id: moduleId }, select: { coverImage: true } });
  await db.module.delete({ where: { id: moduleId } });
  for (const l of lessons) if (l.videoPublicId) await deleteBunnyVideo(l.videoPublicId);
  if (mod?.coverImage) await deleteCloudinaryImageByUrl(mod.coverImage);
  revalidateContent();
  return { success: true as const };
}

export async function moveModule(courseId: string, moduleId: string, direction: "up" | "down") {
  const session = await requireStaff();
  if (!(await canEditCourse(session.user, courseId))) return NOT_ALLOWED;
  const links = await db.courseModule.findMany({ where: { courseId }, orderBy: { order: "asc" } });
  const idx = links.findIndex((l) => l.moduleId === moduleId);
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (idx === -1 || swapIdx < 0 || swapIdx >= links.length) return { success: false as const };

  await db.$transaction([
    db.courseModule.update({ where: { id: links[idx].id }, data: { order: links[swapIdx].order } }),
    db.courseModule.update({ where: { id: links[swapIdx].id }, data: { order: links[idx].order } }),
  ]);
  revalidateContent();
  return { success: true as const };
}

// ── Aulas (conteúdo do módulo: vale em todos os cursos que usam o módulo) ──

export async function createLesson(moduleId: string, input: {
  title: string;
  type: LessonType;
  description?: string;
  videoUrl?: string;
  videoProvider?: VideoProvider;
  videoPublicId?: string;
  pdfUrl?: string;
  duration?: number;
  isFree: boolean;
  isPreview: boolean;
  completionCriteria: CompletionCriteria;
}) {
  const session = await requireStaff();
  if (!(await canEditModule(session.user, moduleId))) return NOT_ALLOWED;
  const last = await db.lesson.findFirst({ where: { moduleId }, orderBy: { order: "desc" } });
  const lesson = await db.lesson.create({
    data: {
      moduleId,
      title: input.title,
      type: input.type,
      status: "draft",
      order: (last?.order ?? 0) + 1,
      description: input.description,
      videoUrl: input.videoUrl,
      videoProvider: input.videoProvider,
      videoPublicId: input.videoPublicId,
      pdfUrl: input.pdfUrl,
      duration: input.duration,
      isFree: input.isFree,
      isPreview: input.isPreview,
      completionCriteria: input.completionCriteria,
    },
  });
  await recalcTotalsForModule(moduleId);
  revalidateContent();
  return { success: true as const, lessonId: lesson.id };
}

export async function updateLesson(lessonId: string, input: {
  title: string;
  type: LessonType;
  description?: string;
  // null = limpar o campo (undefined seria ignorado pelo Prisma)
  videoUrl?: string | null;
  videoProvider?: VideoProvider | null;
  videoPublicId?: string | null;
  pdfUrl?: string | null;
  duration?: number | null;
  isFree: boolean;
  isPreview: boolean;
  completionCriteria: CompletionCriteria;
}) {
  const session = await requireStaff();
  if (!(await canEditLesson(session.user, lessonId))) return NOT_ALLOWED;

  // Se o vídeo foi trocado, remove o antigo do Bunny.
  const old = await db.lesson.findUnique({ where: { id: lessonId }, select: { videoProvider: true, videoPublicId: true } });
  if (old?.videoProvider === "bunny" && old.videoPublicId && old.videoPublicId !== input.videoPublicId) {
    await deleteBunnyVideo(old.videoPublicId);
  }

  const lesson = await db.lesson.update({
    where: { id: lessonId },
    data: {
      title: input.title,
      type: input.type,
      description: input.description,
      // ?? null garante que "remover vídeo" realmente limpa no banco
      videoUrl: input.videoUrl ?? null,
      videoProvider: input.videoProvider ?? null,
      videoPublicId: input.videoPublicId ?? null,
      pdfUrl: input.pdfUrl ?? null,
      duration: input.duration ?? null,
      isFree: input.isFree,
      isPreview: input.isPreview,
      completionCriteria: input.completionCriteria,
    },
  });
  await recalcTotalsForModule(lesson.moduleId);
  revalidateContent();
  return { success: true as const };
}

export async function updateLessonStatus(lessonId: string, status: "draft" | "published") {
  const session = await requireStaff();
  if (!(await canEditLesson(session.user, lessonId))) return NOT_ALLOWED;
  const lesson = await db.lesson.update({ where: { id: lessonId }, data: { status } });
  await recalcTotalsForModule(lesson.moduleId);
  revalidateContent();
  return { success: true as const };
}

export async function deleteLesson(lessonId: string) {
  const session = await requireStaff();
  if (!(await canEditLesson(session.user, lessonId))) return NOT_ALLOWED;
  const lesson = await db.lesson.delete({ where: { id: lessonId } });
  if (lesson.videoProvider === "bunny" && lesson.videoPublicId) {
    await deleteBunnyVideo(lesson.videoPublicId);
  }
  await recalcTotalsForModule(lesson.moduleId);
  revalidateContent();
  return { success: true as const };
}

export async function moveLesson(moduleId: string, lessonId: string, direction: "up" | "down") {
  const session = await requireStaff();
  if (!(await canEditModule(session.user, moduleId))) return NOT_ALLOWED;
  const lessons = await db.lesson.findMany({ where: { moduleId }, orderBy: { order: "asc" } });
  const idx = lessons.findIndex((l) => l.id === lessonId);
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (idx === -1 || swapIdx < 0 || swapIdx >= lessons.length) return { success: false as const };

  await db.$transaction([
    db.lesson.update({ where: { id: lessons[idx].id }, data: { order: lessons[swapIdx].order } }),
    db.lesson.update({ where: { id: lessons[swapIdx].id }, data: { order: lessons[idx].order } }),
  ]);
  revalidateContent();
  return { success: true as const };
}

// Totais exibidos na vitrine: aulas publicadas em módulos publicados no curso.
async function recalcCourseTotals(courseId: string) {
  const lessons = await db.lesson.findMany({ where: courseLessonsWhere(courseId), select: { duration: true } });
  await db.course.update({
    where: { id: courseId },
    data: {
      totalLessons: lessons.length,
      totalDuration: lessons.reduce((sum, l) => sum + (l.duration ?? 0), 0),
    },
  });
}

// Recalcula todos os cursos que usam o módulo.
async function recalcTotalsForModule(moduleId: string) {
  const links = await db.courseModule.findMany({ where: { moduleId }, select: { courseId: true } });
  for (const l of links) await recalcCourseTotals(l.courseId);
}
