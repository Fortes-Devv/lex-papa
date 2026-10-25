import Link from "next/link";
import { GraduationCap, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils/cn";

// Botão flutuante (só para a equipe) que alterna entre o painel admin e a visão do aluno.
// No celular fica acima da barra de baixo; no admin, acima também do botão de ação da
// página ("Novo módulo"). Diálogos e menus ficam por cima dele.
export function ViewSwitch({ to }: { to: "admin" | "student" }) {
  const student = to === "student";
  const Icon = student ? GraduationCap : LayoutDashboard;
  return (
    <Link
      href={student ? "/student/dashboard" : "/admin/dashboard"}
      title={student ? "Ver e estudar como o aluno vê" : "Voltar para o painel de administração"}
      className={cn(
        "fixed right-4 z-[35] inline-flex h-10 items-center gap-2 rounded-full px-3.5 text-[12.5px] font-bold shadow-[0_10px_28px_rgba(31,43,58,.28)] transition-transform hover:-translate-y-0.5 lg:bottom-5 lg:right-5 lg:h-11 lg:px-4 lg:text-[13px]",
        student
          ? "bottom-[calc(160px+env(safe-area-inset-bottom))] bg-navy text-white ring-1 ring-white/10"
          : "bottom-[calc(100px+env(safe-area-inset-bottom))] bg-brand text-white",
      )}
    >
      <Icon className="h-4 w-4" />
      {student ? "Visão do aluno" : "Painel admin"}
    </Link>
  );
}
