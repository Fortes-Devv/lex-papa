"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils/cn";
import type { LessonType, ProductLevel, Lesson } from "@/lib/types";

type CompletionCriteria = Lesson["completionCriteria"];
type VideoProvider = NonNullable<Lesson["videoProvider"]>;

async function requireStaff() {
  const session = await auth();
  if (!session?.user || !["admin", "moderator", "teacher"].includes(session.user.role)) {
    throw new Error("Não autorizado.");
  }
  return session;
}

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
}) {
  const session = await requireStaff();

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
      thumbnail: input.thumbnail || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800",
      price: input.price,
      comparePrice: input.comparePrice,
      level: input.level,
      categoryId: category.id,
      instructors: { connect: [{ id: session.user.id }] },
      course: { create: {} },
    },
    include: { course: true },
  });

  revalidatePath("/admin/courses");
  revalidatePath("/teacher/courses");
  return { success: true as const, productId: product.id, courseId: product.course!.id };
}

export async function updateCourseThumbnail(productId: string, thumbnail: string) {
  await requireStaff();
  await db.product.update({ where: { id: productId }, data: { thumbnail } });
  revalidatePath("/admin/courses");
  revalidatePath("/teacher/courses");
  return { success: true as const };
}

export async function updateCourseStatus(productId: string, status: "draft" | "published") {
  await requireStaff();
  await db.product.update({
    where: { id: productId },
    data: { status, publishedAt: status === "published" ? new Date() : null },
  });
  revalidatePath("/admin/courses");
  revalidatePath("/teacher/courses");
  return { success: true as const };
}

export async function createModule(courseId: string, title: string) {
  await requireStaff();
  const last = await db.module.findFirst({ where: { courseId }, orderBy: { order: "desc" } });
  const mod = await db.module.create({
    data: { courseId, title, order: (last?.order ?? 0) + 1 },
  });
  revalidatePath("/admin/courses");
  revalidatePath("/teacher/content");
  return { success: true as const, moduleId: mod.id };
}

export async function renameModule(moduleId: string, title: string) {
  await requireStaff();
  await db.module.update({ where: { id: moduleId }, data: { title } });
  revalidatePath("/admin/courses");
  revalidatePath("/teacher/content");
  return { success: true as const };
}

export async function toggleModulePublished(moduleId: string, isPublished: boolean) {
  await requireStaff();
  await db.module.update({ where: { id: moduleId }, data: { isPublished } });
  revalidatePath("/admin/courses");
  revalidatePath("/teacher/content");
  return { success: true as const };
}

export async function deleteModule(moduleId: string) {
  await requireStaff();
  await db.module.delete({ where: { id: moduleId } });
  revalidatePath("/admin/courses");
  revalidatePath("/teacher/content");
  return { success: true as const };
}

export async function moveModule(courseId: string, moduleId: string, direction: "up" | "down") {
  await requireStaff();
  const modules = await db.module.findMany({ where: { courseId }, orderBy: { order: "asc" } });
  const idx = modules.findIndex((m) => m.id === moduleId);
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (idx === -1 || swapIdx < 0 || swapIdx >= modules.length) return { success: false as const };

  await db.$transaction([
    db.module.update({ where: { id: modules[idx].id }, data: { order: modules[swapIdx].order } }),
    db.module.update({ where: { id: modules[swapIdx].id }, data: { order: modules[idx].order } }),
  ]);
  revalidatePath("/admin/courses");
  revalidatePath("/teacher/content");
  return { success: true as const };
}

export async function createLesson(moduleId: string, input: {
  title: string;
  type: LessonType;
  description?: string;
  videoUrl?: string;
  videoProvider?: VideoProvider;
  videoPublicId?: string;
  duration?: number;
  isFree: boolean;
  isPreview: boolean;
  completionCriteria: CompletionCriteria;
}) {
  await requireStaff();
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
      duration: input.duration,
      isFree: input.isFree,
      isPreview: input.isPreview,
      completionCriteria: input.completionCriteria,
    },
  });
  await recalcCourseTotals(moduleId);
  revalidatePath("/admin/courses");
  revalidatePath("/teacher/content");
  return { success: true as const, lessonId: lesson.id };
}

export async function updateLesson(lessonId: string, input: {
  title: string;
  type: LessonType;
  description?: string;
  videoUrl?: string;
  videoProvider?: VideoProvider;
  videoPublicId?: string;
  duration?: number;
  isFree: boolean;
  isPreview: boolean;
  completionCriteria: CompletionCriteria;
}) {
  await requireStaff();
  const lesson = await db.lesson.update({
    where: { id: lessonId },
    data: {
      title: input.title,
      type: input.type,
      description: input.description,
      videoUrl: input.videoUrl,
      videoProvider: input.videoProvider,
      videoPublicId: input.videoPublicId,
      duration: input.duration,
      isFree: input.isFree,
      isPreview: input.isPreview,
      completionCriteria: input.completionCriteria,
    },
  });
  await recalcCourseTotals(lesson.moduleId);
  revalidatePath("/admin/courses");
  revalidatePath("/teacher/content");
  return { success: true as const };
}

export async function updateLessonStatus(lessonId: string, status: "draft" | "published") {
  await requireStaff();
  await db.lesson.update({ where: { id: lessonId }, data: { status } });
  revalidatePath("/admin/courses");
  revalidatePath("/teacher/content");
  return { success: true as const };
}

export async function deleteLesson(lessonId: string) {
  await requireStaff();
  const lesson = await db.lesson.delete({ where: { id: lessonId } });
  await recalcCourseTotals(lesson.moduleId);
  revalidatePath("/admin/courses");
  revalidatePath("/teacher/content");
  return { success: true as const };
}

export async function moveLesson(moduleId: string, lessonId: string, direction: "up" | "down") {
  await requireStaff();
  const lessons = await db.lesson.findMany({ where: { moduleId }, orderBy: { order: "asc" } });
  const idx = lessons.findIndex((l) => l.id === lessonId);
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (idx === -1 || swapIdx < 0 || swapIdx >= lessons.length) return { success: false as const };

  await db.$transaction([
    db.lesson.update({ where: { id: lessons[idx].id }, data: { order: lessons[swapIdx].order } }),
    db.lesson.update({ where: { id: lessons[swapIdx].id }, data: { order: lessons[idx].order } }),
  ]);
  revalidatePath("/admin/courses");
  revalidatePath("/teacher/content");
  return { success: true as const };
}

async function recalcCourseTotals(moduleId: string) {
  const mod = await db.module.findUnique({ where: { id: moduleId }, select: { courseId: true } });
  if (!mod) return;
  const lessons = await db.lesson.findMany({ where: { module: { courseId: mod.courseId } } });
  await db.course.update({
    where: { id: mod.courseId },
    data: {
      totalLessons: lessons.length,
      totalDuration: lessons.reduce((sum, l) => sum + (l.duration ?? 0), 0),
    },
  });
}
