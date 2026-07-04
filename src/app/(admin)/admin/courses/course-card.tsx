"use client";
import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, Clock, BookOpen, Users, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { formatCurrency, formatDuration } from "@/lib/utils/cn";
import { updateCourseStatus, deleteCourse } from "@/lib/actions/courses";
import { CourseContentEditor, type EditorModule } from "@/components/course/course-content-editor";
import { EditCourseDialog } from "@/components/course/edit-course-dialog";
import type { ProductLevel } from "@/lib/types";

export interface CourseCardData {
  productId: string;
  courseId: string;
  title: string;
  thumbnail: string;
  status: string;
  price: number;
  comparePrice?: number;
  shortDescription: string;
  description: string;
  categoryName: string;
  level: ProductLevel;
  enrolledCount: number;
  totalLessons: number;
  totalDuration: number;
  modules: EditorModule[];
}

export function CourseCard({ course }: { course: CourseCardData }) {
  const { success, error } = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function togglePublish() {
    setLoading(true);
    const next = course.status === "published" ? "draft" : "published";
    await updateCourseStatus(course.productId, next);
    success(next === "published" ? "Curso publicado." : "Curso voltou para rascunho.");
    setLoading(false);
    router.refresh();
  }

  async function handleDelete() {
    setDeleting(true);
    const result = await deleteCourse(course.productId);
    setDeleting(false);
    if (!result.success) { error(result.error); setConfirmOpen(false); return; }
    success("Curso excluído.");
    setConfirmOpen(false);
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-3 p-3">
        <button onClick={() => setOpen((v) => !v)} className="text-foreground-muted shrink-0">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
          {course.thumbnail && <Image src={course.thumbnail} alt={course.title} fill className="object-cover" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground text-sm truncate">{course.title}</p>
          <div className="flex items-center gap-3 mt-1 text-xs text-foreground-muted">
            <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" />{course.totalLessons} aulas</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDuration(course.totalDuration)}</span>
            <span className="flex items-center gap-1"><Users className="h-3 w-3" />{course.enrolledCount} alunos</span>
            <span>{formatCurrency(course.price)}</span>
          </div>
        </div>
        {course.price <= 0 && (
          <Badge variant="destructive" className="shrink-0">Sem preço</Badge>
        )}
        <Badge variant={course.status === "published" ? "success" : "secondary"} className="shrink-0">
          {course.status === "published" ? "Publicado" : "Rascunho"}
        </Badge>
        <EditCourseDialog
          initial={{
            productId: course.productId,
            title: course.title,
            shortDescription: course.shortDescription,
            description: course.description,
            price: course.price,
            comparePrice: course.comparePrice,
            categoryName: course.categoryName,
            level: course.level,
            thumbnail: course.thumbnail,
          }}
        />
        <Button size="sm" variant="outline" onClick={togglePublish} loading={loading} className="shrink-0">
          {course.status === "published" ? "Despublicar" : "Publicar"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setConfirmOpen(true)} className="shrink-0" title="Excluir curso">
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>

      {open && (
        <div className="border-t border-border p-3">
          <CourseContentEditor courseId={course.courseId} modules={course.modules} />
        </div>
      )}

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Excluir curso"
        description={`Tem certeza que deseja excluir "${course.title}"? Todos os módulos e aulas serão removidos permanentemente. Esta ação não pode ser desfeita.`}
      >
        <DialogFooter>
          <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancelar</Button>
          <Button variant="destructive" onClick={handleDelete} loading={deleting}>Excluir definitivamente</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
