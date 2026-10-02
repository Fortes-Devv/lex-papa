"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Eye, EyeOff, ExternalLink, MonitorPlay } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import type { DropdownItem } from "@/components/ui/dropdown";
import { ModuleBoard } from "@/components/course/module-board/module-board";
import type { CourseHeaderInfo, EditorModule, TeacherOption } from "@/components/course/module-board/types";
import { EditCourseDialog, type EditCourseInitial } from "@/components/course/edit-course-dialog";
import { updateCourseStatus } from "@/lib/actions/courses";

export function AdminCourseBoard({ header, slug, modules, teachers, editInitial }: {
  header: CourseHeaderInfo;
  slug: string;
  modules: EditorModule[];
  teachers: TeacherOption[];
  editInitial: EditCourseInitial;
}) {
  const router = useRouter();
  const { success, error } = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const published = header.status === "published";

  const courseMenu: DropdownItem[] = [
    { label: "Editar dados do curso", icon: <Pencil className="h-3.5 w-3.5" />, onClick: () => setEditOpen(true) },
    {
      label: published ? "Despublicar curso" : "Publicar curso",
      icon: published ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />,
      onClick: async () => {
        const result = await updateCourseStatus(header.productId, published ? "draft" : "published");
        if (!result.success) { error(result.error); return; }
        success(published ? "Curso voltou para rascunho." : "Curso publicado.");
        router.refresh();
      },
    },
    { label: "Assistir como aluno", icon: <MonitorPlay className="h-3.5 w-3.5" />, href: `/preview/${header.courseId}` },
    ...(published ? [{ label: "Ver página de venda", icon: <ExternalLink className="h-3.5 w-3.5" />, href: `/cursos/${slug}` }] : []),
  ];

  return (
    <>
      <ModuleBoard header={header} modules={modules} teachers={teachers} backHref="/admin/courses" courseMenu={courseMenu} />
      <EditCourseDialog initial={editInitial} open={editOpen} onOpenChange={setEditOpen} />
    </>
  );
}
