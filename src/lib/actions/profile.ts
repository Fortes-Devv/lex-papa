"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteCloudinaryImageByUrl } from "@/lib/cloudinary";

const profileSchema = z.object({
  name: z.string().min(2, "Nome muito curto"),
  bio: z.string().max(500).optional(),
  phone: z.string().max(30).optional(),
  location: z.string().max(120).optional(),
});

export async function updateProfile(input: { name: string; bio?: string; phone?: string; location?: string }) {
  const session = await auth();
  if (!session?.user) return { success: false as const, error: "Faça login." };

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { success: false as const, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  await db.user.update({
    where: { id: session.user.id },
    data: {
      name: parsed.data.name,
      bio: parsed.data.bio || null,
      phone: parsed.data.phone || null,
      location: parsed.data.location || null,
    },
  });

  revalidatePath("/student/profile");
  return { success: true as const };
}

export async function updateAvatar(avatarUrl: string) {
  const session = await auth();
  if (!session?.user) return { success: false as const, error: "Faça login." };

  // Remove o avatar anterior do Cloudinary, se houver e for diferente.
  const current = await db.user.findUnique({ where: { id: session.user.id }, select: { avatar: true } });
  if (current?.avatar && current.avatar !== avatarUrl) {
    await deleteCloudinaryImageByUrl(current.avatar);
  }

  await db.user.update({ where: { id: session.user.id }, data: { avatar: avatarUrl || null } });
  revalidatePath("/student/profile");
  revalidatePath("/teacher/profile");
  revalidatePath("/admin/profile");
  return { success: true as const };
}

export async function changePassword(input: { current: string; next: string }) {
  const session = await auth();
  if (!session?.user) return { success: false as const, error: "Faça login." };
  if (input.next.length < 8) return { success: false as const, error: "A nova senha precisa ter no mínimo 8 caracteres." };

  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user) return { success: false as const, error: "Usuário não encontrado." };

  const valid = await bcrypt.compare(input.current, user.passwordHash);
  if (!valid) return { success: false as const, error: "Senha atual incorreta." };

  const passwordHash = await bcrypt.hash(input.next, 10);
  await db.user.update({ where: { id: user.id }, data: { passwordHash } });
  return { success: true as const };
}
