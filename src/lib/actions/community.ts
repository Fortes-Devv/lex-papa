"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function createPost(content: string) {
  const session = await auth();
  if (!session?.user) return { success: false as const, error: "Faça login." };
  if (!content.trim()) return { success: false as const, error: "Post vazio." };

  await db.post.create({ data: { authorId: session.user.id, content: content.trim() } });
  revalidatePath("/student/community");
  return { success: true as const };
}

export async function togglePostLike(postId: string) {
  const session = await auth();
  if (!session?.user) return { success: false as const, error: "Faça login." };

  const existing = await db.postLike.findUnique({
    where: { postId_userId: { postId, userId: session.user.id } },
  });

  if (existing) {
    await db.postLike.delete({ where: { id: existing.id } });
  } else {
    await db.postLike.create({ data: { postId, userId: session.user.id } });
  }

  revalidatePath("/student/community");
  return { success: true as const, liked: !existing };
}
