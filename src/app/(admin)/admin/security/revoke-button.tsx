"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { adminRevokeSession, adminRevokeUserSessions } from "@/lib/actions/security";

// Botão "Desconectar": um aparelho (sessionId) ou todos os aparelhos da conta (userId).
export function RevokeButton({ sessionId, userId, label }: { sessionId?: string; userId?: string; label: string }) {
  const router = useRouter();
  const { success, error } = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        if (userId && !confirm("Desconectar todos os aparelhos desta conta? O aluno vai precisar entrar de novo.")) return;
        setBusy(true);
        const res = sessionId ? await adminRevokeSession(sessionId) : await adminRevokeUserSessions(userId!);
        setBusy(false);
        if (!res.success) { error(res.error); return; }
        success(sessionId ? "Aparelho desconectado." : "Todos os aparelhos foram desconectados.");
        router.refresh();
      }}
      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line-strong px-2.5 text-xs font-semibold text-foreground hover:bg-background disabled:opacity-50 dark:border-white/10"
    >
      <LogOut className="h-3.5 w-3.5" /> {busy ? "Desconectando…" : label}
    </button>
  );
}
