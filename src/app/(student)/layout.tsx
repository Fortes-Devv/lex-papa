import { LayoutDashboard, BookOpen, Library, User, MessageSquare, Heart } from "lucide-react";
import { AreaShell } from "@/components/layout/area-shell";
import { requireArea } from "@/lib/auth-guards";

const navSections = [
  {
    items: [
      { label: "Dashboard", href: "/student/dashboard", icon: <LayoutDashboard className="h-4 w-4" />, exact: true },
    ],
  },
  {
    title: "Aprendizado",
    items: [
      { label: "Meus Cursos", href: "/student/library", icon: <Library className="h-4 w-4" /> },
      { label: "Explorar", href: "/student/explore", icon: <BookOpen className="h-4 w-4" /> },
      { label: "Favoritos", href: "/student/favorites", icon: <Heart className="h-4 w-4" /> },
    ],
  },
  {
    title: "Conquistas",
    items: [
      { label: "Comunidade", href: "/student/community", icon: <MessageSquare className="h-4 w-4" /> },
    ],
  },
  {
    title: "Conta",
    items: [
      { label: "Meu Perfil", href: "/student/profile", icon: <User className="h-4 w-4" /> },
    ],
  },
];

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  await requireArea("student");
  return <AreaShell label="Área do Aluno" sections={navSections} withAos>{children}</AreaShell>;
}
