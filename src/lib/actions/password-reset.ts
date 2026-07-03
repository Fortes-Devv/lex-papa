"use server";

import crypto from "crypto";
import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { isEmailConfigured, sendEmail } from "@/lib/email";

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function requestPasswordReset(email: string) {
  // Sempre responde sucesso genérico para não revelar se o e-mail existe.
  if (!isEmailConfigured()) {
    return { success: false as const, error: "O envio de e-mail ainda não está configurado nesta plataforma. Configure RESEND_API_KEY e EMAIL_FROM." };
  }

  const user = await db.user.findUnique({ where: { email } });
  if (user) {
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h
    await db.passwordResetToken.create({ data: { email, tokenHash, expiresAt } });

    const host = headers().get("host");
    const proto = host?.includes("localhost") ? "http" : "https";
    const link = `${proto}://${host}/reset-password?token=${token}`;

    await sendEmail({
      to: email,
      subject: "Redefinição de senha — LEX Concursos",
      html: `<p>Olá,</p><p>Clique no link abaixo para redefinir sua senha (válido por 1 hora):</p><p><a href="${link}">${link}</a></p><p>Se você não solicitou, ignore este e-mail.</p>`,
    });
  }

  return { success: true as const };
}

export async function resetPassword(token: string, newPassword: string) {
  if (newPassword.length < 8) return { success: false as const, error: "A senha precisa ter no mínimo 8 caracteres." };

  const tokenHash = hashToken(token);
  const record = await db.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return { success: false as const, error: "Link inválido ou expirado. Solicite um novo." };
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await db.user.update({ where: { email: record.email }, data: { passwordHash } });
  await db.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } });

  return { success: true as const };
}
