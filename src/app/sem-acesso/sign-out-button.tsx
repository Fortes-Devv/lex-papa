"use client";
import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button type="button" onClick={() => signOut({ callbackUrl: "/login" })} className="h-11 rounded-xl bg-brand px-6 text-sm font-bold text-white hover:bg-brand-dark">
      Sair
    </button>
  );
}
