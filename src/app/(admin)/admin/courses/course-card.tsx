"use client";
import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, Clock, BookOpen, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { formatCurrency, formatDuration } from "@/lib/utils/cn";
import { updateCourseStatus } from "@/lib/actions/courses";
import { CourseContentEditor, type EditorModule } from "@/components/course/course-content-editor";

export interface CourseCardData {
  productId: string;
  courseId: string;
  title: string;
  thumbnail: string;
  status: string;
  price: number;
  enrolledCount: number;
  totalLessons: number;
  totalDuration: number;
  modules: EditorModule[];
}

export function CourseCard({ course }: { course: CourseCardData }) {
  const { success } = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function togglePublish() {
    setLoading(true);
    const next = course.status === "published" ? "draft" : "published";
    await updateCourseStatus(course.productId, next);
    success(next === "published" ? "Curso publicado." : "Curso voltou para rascunho.");
    setLoading(false);
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
        <Badge variant={course.status === "published" ? "success" : "secondary"} className="shrink-0">
          {course.status === "published" ? "Publicado" : "Rascunho"}
        </Badge>
        <Button size="sm" variant="outline" onClick={togglePublish} loading={loading} className="shrink-0">
          {course.status === "published" ? "Despublicar" : "Publicar"}
        </Button>
      </div>

      {open && (
        <div className="border-t border-border p-3">
          <CourseContentEditor courseId={course.courseId} modules={course.modules} />
        </div>
      )}
    </div>
  );
}
