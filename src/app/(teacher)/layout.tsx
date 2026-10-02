import { LayoutDashboard, BookOpen, FileVideo, Layers, Users, BarChart2 } from "lucide-react";
import { AreaShell } from "@/components/layout/area-shell";
import { requireArea } from "@/lib/auth-guards";

const navSections = [
  {
    items: [
      { label: "Dashboard", href: "/teacher/dashboard", icon: <LayoutDashboard className="h-4 w-4" />, exact: true },
    ],
  },
  {
    title: "Conteúdo",
    items: [
      { label: "Meus Cursos", href: "/teacher/courses", icon: <BookOpen className="h-4 w-4" /> },
      { label: "Meus Módulos", href: "/teacher/modules", icon: <Layers className="h-4 w-4" /> },
      { label: "Editor de Aulas", href: "/teacher/content", icon: <FileVideo className="h-4 w-4" /> },
    ],
  },
  {
    title: "Alunos",
    items: [
      { label: "Alunos", href: "/teacher/students", icon: <Users className="h-4 w-4" /> },
    ],
  },
  {
    title: "Performance",
    items: [
      { label: "Analytics", href: "/teacher/analytics", icon: <BarChart2 className="h-4 w-4" /> },
    ],
  },
];

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  await requireArea("teacher");
  return <AreaShell label="Professor" sections={navSections} withAos>{children}</AreaShell>;
}
