"use server";

import crypto from "crypto";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { isEmailConfigured, sendEmail } from "@/lib/email";
import { passwordResetEmailHtml } from "@/lib/email-templates";
import { clientIp, hitRateLimit, normalizeEmail } from "@/lib/rate-limit";
import { siteUrl } from "@/lib/site-url";

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function requestPasswordReset(rawEmail: string) {
  // Sempre responde sucesso genérico: não revela se o e-mail existe nem a configuração.
  const generic = { success: true as const };
  const email = normalizeEmail(rawEmail);
  if (!email) return generic;

  // Limite: 3 pedidos por e-mail e 10 por IP por hora (excesso é ignorado em silêncio).
  const byEmail = await hitRateLimit(`reset:email:${email}`, 3, 60 * 60);
  const byIp = await hitRateLimit(`reset:ip:${await clientIp()}`, 10, 60 * 60);
  if (!byEmail.allowed || !byIp.allowed) return generic;

  const baseUrl = siteUrl();
  if (!isEmailConfigured() || !baseUrl) {
    console.error("[password-reset] envio indisponível: configure RESEND_API_KEY, EMAIL_FROM e APP_URL.");
    return generic;
  }

  const user = await db.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
  if (user) {
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h

    // Só o link mais recente vale: invalida pedidos anteriores ainda não usados.
    await db.passwordResetToken.updateMany({ where: { email: user.email, usedAt: null }, data: { usedAt: new Date() } });
    await db.passwordResetToken.create({ data: { email: user.email, tokenHash, expiresAt } });

    await sendEmail({
      to: user.email,
      subject: "Redefinição de senha — LEX Concursos",
      html: passwordResetEmailHtml(`${baseUrl}/reset-password?token=${token}`),
    });
  }

  return generic;
}

export async function resetPassword(token: string, newPassword: string) {
  if (newPassword.length < 8) return { success: false as const, error: "A senha precisa ter no mínimo 8 caracteres." };

  const tokenHash = hashToken(token);
  const record = await db.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return { success: false as const, error: "Link inválido ou expirado. Solicite um novo." };
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await db.$transaction([
    db.user.update({ where: { email: record.email }, data: { passwordHash } }),
    // Invalida este e qualquer outro link pendente do mesmo e-mail.
    db.passwordResetToken.updateMany({ where: { email: record.email, usedAt: null }, data: { usedAt: new Date() } }),
  ]);

  return { success: true as const };
}
