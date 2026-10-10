export const dynamic = "force-dynamic";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { Eye } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PlayerClient, type PlayerModule, type PlayerLesson } from "@/app/(student)/student/player/player-client";
import { toStudentQuiz } from "@/lib/quiz";
import { resolveLessonVideoUrl } from "@/lib/bunny";

export default async function CoursePreviewPage(props: { params: Promise<{ courseId: string }> }) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user) redirect("/login");
  // Só a equipe (admin/moderador) pode pré-visualizar sem matrícula.
  if (!["admin", "moderator"].includes(session.user.role)) {
    redirect("/");
  }

  const course = await db.course.findUnique({
    where: { id: params.courseId },
    include: {
      product: { include: { instructors: { select: { id: true } } } },
      modules: {
        where: { section: "aulas" },
        orderBy: { order: "asc" },
        include: {
          module: {
            include: {
              lessons: {
                orderBy: { order: "asc" },
                include: {
                  quiz: { include: { questions: { orderBy: { order: "asc" } } } },
                  materials: { where: { type: "pdf" }, orderBy: { createdAt: "asc" }, select: { id: true, title: true } },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!course) notFound();


  // No preview, todas as aulas ficam desbloqueadas e nada é marcado como concluído.
  const modules: PlayerModule[] = course.modules.map(({ module: m }) => ({
    id: m.id,
    title: m.title,
    lessons: m.lessons.map<PlayerLesson>((l) => ({
      id: l.id,
      title: l.title,
      type: l.type,
      duration: l.duration,
      videoUrl: resolveLessonVideoUrl(l),
      hasPdf: !!l.pdfUrl,
      materials: l.materials,
      description: l.description,
      isFree: l.isFree,
      locked: false,
      isCompleted: false,
      note: "",
      quiz: toStudentQuiz(l.quiz),
    })),
  }));

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-10 items-center gap-2 border-b border-border bg-card px-4 text-xs">
        <Eye className="h-3.5 w-3.5 text-primary" />
        <span className="font-medium text-foreground">Modo pré-visualização</span>
        <span className="text-foreground-muted">— {course.product.title}</span>
        <Link href="/admin/courses" className="ml-auto text-primary hover:underline">Voltar ao editor</Link>
      </div>
      <div className="p-6">
        {/* isEnrolled=false: preview não registra progresso nem XP */}
        <PlayerClient
          courseId={course.id}
          courseTitle={course.product.title}
          modules={modules}
          isEnrolled={false}
          backHref="/admin/courses"
        />
      </div>
    </div>
  );
}
