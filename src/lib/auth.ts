import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { authConfig } from "@/lib/auth.config";
import { clientIpFrom, hitRateLimit, normalizeEmail } from "@/lib/rate-limit";

// Erro com código próprio para a tela de login mostrar "muitas tentativas".
class TooManyAttempts extends CredentialsSignin {
  code = "rate_limited";
}
// Professor é só crédito nos módulos: não entra na plataforma.
class NoAccess extends CredentialsSignin {
  code = "no_access";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt" },
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials, request) {
        const rawEmail = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!rawEmail || !password) return null;
        const email = normalizeEmail(rawEmail);

        // Limite: 5 tentativas por e-mail e 20 por IP a cada 15 minutos.
        const ip = clientIpFrom(request.headers);
        const byEmail = await hitRateLimit(`login:email:${email}`, 5, 15 * 60);
        const byIp = await hitRateLimit(`login:ip:${ip}`, 20, 15 * 60);
        if (!byEmail.allowed || !byIp.allowed) throw new TooManyAttempts();

        const user = await db.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
        if (!user || user.status !== "active") return null;

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) return null;
        if (user.role === "teacher") throw new NoAccess();

        await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.avatar ?? undefined,
          role: user.role,
        };
      },
    }),
  ],
});
