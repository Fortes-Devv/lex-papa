"use client";

import { useSession } from "next-auth/react";
import type { User } from "@/lib/types";

// Placeholder até o usuário logar (ou durante o carregamento da sessão).
// Campos de perfil completos (bio, phone, etc.) são preenchidos a partir do
// banco de dados real quando a tela consumidora busca o usuário por id.
const EMPTY_USER: User = {
  id: "",
  name: "",
  email: "",
  role: "student",
  status: "active",
  twoFactorEnabled: false,
  emailVerified: false,
  oauthProviders: [],
  createdAt: "",
  updatedAt: "",
};

export function useCurrentUser(): User {
  const { data: session } = useSession();
  if (!session?.user) return EMPTY_USER;

  return {
    ...EMPTY_USER,
    id: session.user.id,
    name: session.user.name ?? "",
    email: session.user.email ?? "",
    avatar: session.user.image ?? undefined,
    role: session.user.role,
  };
}
