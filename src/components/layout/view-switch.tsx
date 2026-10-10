import Link from "next/link";
import { GraduationCap, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils/cn";

// Botão flutuante (só para a equipe) que alterna entre o painel admin e a visão do aluno.
// No celular fica acima da barra inferior; diálogos e menus ficam por cima dele.
export function ViewSwitch({ to }: { to: "admin" | "student" }) {
  const student = to === "student";
  const Icon = student ? GraduationCap : LayoutDashboard;
  return (
    <Link
      href={student ? "/student/dashboard" : "/admin/dashboard"}
      title={student ? "Ver e estudar como o aluno vê" : "Voltar para o painel de administração"}
      className={cn(
        "fixed bottom-[84px] right-4 z-[35] inline-flex h-11 items-center gap-2 rounded-full px-4 text-[13px] font-bold shadow-[0_10px_28px_rgba(31,43,58,.28)] transition-transform hover:-translate-y-0.5 lg:bottom-5 lg:right-5",
        student ? "bg-navy text-white ring-1 ring-white/10" : "bg-brand text-white",
      )}
    >
      <Icon className="h-4 w-4" />
      {student ? "Visão do aluno" : "Painel admin"}
    </Link>
  );
}
