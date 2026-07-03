"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils/cn";
import { logAudit } from "@/lib/audit";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "admin" && session.user.role !== "moderator")) {
    throw new Error("Não autorizado.");
  }
  return session;
}

async function uniquePageSlug(title: string, ignoreId?: string) {
  const base = slugify(title);
  let slug = base;
  let n = 1;
  while (true) {
    const found = await db.cMSPage.findUnique({ where: { slug } });
    if (!found || found.id === ignoreId) break;
    slug = `${base}-${++n}`;
  }
  return slug;
}

export async function savePage(input: { id?: string; title: string; content: string; status: "draft" | "published" }) {
  const session = await requireAdmin();
  if (!input.title.trim()) return { success: false as const, error: "Título obrigatório." };

  if (input.id) {
    await db.cMSPage.update({
      where: { id: input.id },
      data: { title: input.title, content: input.content, status: input.status, publishedAt: input.status === "published" ? new Date() : null },
    });
  } else {
    const slug = await uniquePageSlug(input.title);
    const page = await db.cMSPage.create({
      data: { title: input.title, slug, content: input.content, status: input.status, publishedAt: input.status === "published" ? new Date() : null },
    });
    await logAudit({ actorId: session.user.id, action: "page.created", resourceType: "cms_page", resourceId: page.id });
  }
  revalidatePath("/admin/cms");
  return { success: true as const };
}

export async function deletePage(id: string) {
  await requireAdmin();
  await db.cMSPage.delete({ where: { id } });
  revalidatePath("/admin/cms");
  return { success: true as const };
}

export async function saveArticle(input: { id?: string; title: string; excerpt: string; content: string; status: "draft" | "published" }) {
  const session = await requireAdmin();
  if (!input.title.trim()) return { success: false as const, error: "Título obrigatório." };

  if (input.id) {
    await db.article.update({
      where: { id: input.id },
      data: { title: input.title, excerpt: input.excerpt, content: input.content, status: input.status, publishedAt: input.status === "published" ? new Date() : null },
    });
  } else {
    const base = slugify(input.title);
    let slug = base;
    let n = 1;
    while (await db.article.findUnique({ where: { slug } })) slug = `${base}-${++n}`;
    await db.article.create({
      data: { title: input.title, slug, excerpt: input.excerpt, content: input.content, status: input.status, authorId: session.user.id, publishedAt: input.status === "published" ? new Date() : null },
    });
  }
  revalidatePath("/admin/cms");
  return { success: true as const };
}

export async function deleteArticle(id: string) {
  await requireAdmin();
  await db.article.delete({ where: { id } });
  revalidatePath("/admin/cms");
  return { success: true as const };
}
