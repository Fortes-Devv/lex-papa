import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { authConfig } from "@/lib/auth.config";
import { clientIpFrom, hitRateLimit, normalizeEmail } from "@/lib/rate-limit";
import { checkSession, logSecurityEvent, openSession, requestInfo, revokeSession } from "@/lib/security";

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
  callbacks: {
    ...authConfig.callbacks,
    // Versão completa (Node): além de copiar os dados, confere no banco se a sessão do
    // aparelho continua ativa e se a conta não foi suspensa. Devolver null desconecta.
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
        token.sid = user.sid;
        return token;
      }
      // Login de antes do controle de sessões: pede para entrar de novo (uma vez).
      const sid = token.sid as string | undefined;
      const uid = token.id as string | undefined;
      if (!sid || !uid) return null;
      const check = await checkSession(sid, uid);
      if (!check.ok) return null;
      // Papel atualizado (ex.: virou admin) sem precisar sair e entrar.
      if (check.role) token.role = check.role as typeof token.role;
      if (check.name) token.name = check.name;
      return token;
    },
  },
  events: {
    async signOut(message) {
      const sid = "token" in message ? (message.token?.sid as string | undefined) : undefined;
      if (sid) await revokeSession(sid, "logout", "user");
    },
  },
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
        const info = requestInfo(request.headers);

        // Limite: 5 tentativas por e-mail e 20 por IP a cada 15 minutos.
        const ip = clientIpFrom(request.headers);
        const byEmail = await hitRateLimit(`login:email:${email}`, 5, 15 * 60);
        const byIp = await hitRateLimit(`login:ip:${ip}`, 20, 15 * 60);
        if (!byEmail.allowed || !byIp.allowed) {
          await logSecurityEvent({ type: "login_rate_limited", severity: "medium", email, ...info, reason: !byEmail.allowed ? "muitas tentativas neste e-mail" : "muitas tentativas deste IP" });
          throw new TooManyAttempts();
        }

        const user = await db.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
        if (!user) {
          await logSecurityEvent({ type: "login_fail", severity: "low", email, ...info, reason: "e-mail não cadastrado" });
          return null;
        }
        if (user.status !== "active") {
          await logSecurityEvent({ type: "login_blocked", severity: "medium", userId: user.id, email, ...info, reason: `conta ${user.status}` });
          return null;
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
          await logSecurityEvent({ type: "login_fail", severity: "low", userId: user.id, email, ...info, reason: "senha errada" });
          return null;
        }
        if (user.role === "teacher") throw new NoAccess();

        await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
        const sid = await openSession(user, info);
        await logSecurityEvent({ type: "login_ok", severity: "low", userId: user.id, sessionId: sid, ...info });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.avatar ?? undefined,
          role: user.role,
          sid,
        };
      },
    }),
  ],
});
