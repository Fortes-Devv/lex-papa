import type { DefaultSession } from "next-auth";
import type { UserRole } from "@/lib/types";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      sid?: string; // sessão do aparelho (user_sessions)
    } & DefaultSession["user"];
  }

  interface User {
    role: UserRole;
    sid?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    sid?: string;
  }
}
