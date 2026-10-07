"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { clientIp, hitRateLimit, normalizeEmail } from "@/lib/rate-limit";
import { invalidEmailReason } from "@/lib/email-check";

const registerSchema = z.object({
  name: z.string().min(2, "Nome muito curto"),
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "A senha precisa ter no mínimo 8 caracteres"),
});

export async function registerUser(input: { name: string; email: string; password: string }) {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const { name, password } = parsed.data;
  const email = normalizeEmail(parsed.data.email);
  const badEmail = invalidEmailReason(email);
  if (badEmail) return { success: false as const, error: badEmail };

  // Limite: 5 cadastros por IP por hora.
  const limit = await hitRateLimit(`register:ip:${await clientIp()}`, 5, 60 * 60);
  if (!limit.allowed) return { success: false as const, error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." };

  const existing = await db.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
  if (existing) {
    return { success: false as const, error: "Este email já está cadastrado." };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await db.user.create({
    data: { name, email, passwordHash, role: "student" },
  });

  return { success: true as const };
}
