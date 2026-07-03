import type { NextAuthConfig } from "next-auth";

const ROLE_HOME: Record<string, string> = {
  admin: "/admin/dashboard",
  moderator: "/admin/dashboard",
  teacher: "/teacher/dashboard",
  student: "/student/dashboard",
};

const AUTH_PAGES = ["/login", "/register", "/forgot-password", "/two-factor"];

// Config "leve": sem providers/DB, roda no Edge Runtime do middleware.
// A config completa (com Credentials + Prisma) fica em src/lib/auth.ts.
export const authConfig = {
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user as { role: string }).role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as typeof session.user.role;
      }
      return session;
    },
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const role = auth?.user?.role;
      const path = request.nextUrl.pathname;

      const isAuthPage = AUTH_PAGES.some((p) => path.startsWith(p));
      const areaMatch = path.match(/^\/(admin|teacher|student)(\/|$)/);

      if (isAuthPage) {
        if (isLoggedIn) {
          return Response.redirect(new URL(ROLE_HOME[role ?? "student"], request.nextUrl));
        }
        return true;
      }

      if (areaMatch) {
        if (!isLoggedIn) return false; // NextAuth redireciona para pages.signIn
        const area = areaMatch[1];
        const allowed = area === "admin" ? role === "admin" || role === "moderator" : role === area;
        if (!allowed) {
          return Response.redirect(new URL(ROLE_HOME[role ?? "student"] ?? "/login", request.nextUrl));
        }
      }

      return true;
    },
  },
} satisfies NextAuthConfig;
