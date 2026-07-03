"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function toggleFavorite(productId: string) {
  const session = await auth();
  if (!session?.user) return { success: false as const, error: "Faça login." };

  const existing = await db.favorite.findUnique({
    where: { userId_productId: { userId: session.user.id, productId } },
  });

  if (existing) {
    await db.favorite.delete({ where: { id: existing.id } });
  } else {
    await db.favorite.create({ data: { userId: session.user.id, productId } });
  }

  revalidatePath("/student/favorites");
  revalidatePath("/student/explore");
  return { success: true as const, favorited: !existing };
}
