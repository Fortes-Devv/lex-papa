export const dynamic = "force-dynamic";
// Importação do Google Drive (server action desta página) chama Drive e Bunny.
export const maxDuration = 60;
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { db } from "@/lib/db";
import { requireArea } from "@/lib/auth-guards";
import { loadEditorModules } from "@/lib/editor-modules";
import { AdminCourseBoard } from "./course-board-client";
import { CourseSectionList, CourseSectionSoon, parseCourseSection } from "@/components/course/course-sections";
import { CdnImg } from "@/components/ui/cdn-img";

// Curso no admin: abre na lista de seções, como o aluno vê. "Aulas e Materiais" é a
// área de módulos (capas, preview das aulas e organização dos módulos).
export default async function AdminCoursePage(props: { params: Promise<{ courseId: string }>; searchParams: Promise<{ secao?: string; modulo?: string }> }) {
  const { courseId } = await props.params;
  const sp = await props.searchParams;
  const session = await requireArea("admin");

  const course = await db.course.findUnique({
    where: { id: courseId },
    include: { product: { include: { category: true } } },
  });
  if (!course) notFound();
  const p = course.product;
  const home = `/admin/courses/${course.id}`;
  // O quadro de módulos põe ?modulo= na URL: esse link continua abrindo as aulas.
  const section = parseCourseSection(sp.secao) ?? (sp.modulo ? "aulas" : null);

  if (!section) {
    const modulesCount = await db.courseModule.count({ where: { courseId: course.id } });
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Link href="/admin/courses" className="inline-flex items-center gap-1 text-sm font-semibold text-foreground-muted hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Cursos
        </Link>
        <div className="flex items-center gap-3">
          <CdnImg src={p.thumbnail} width={96} alt="" className="h-12 w-12 shrink-0 rounded-xl bg-navy object-cover" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[19px] font-extrabold text-foreground lg:text-[22px]">{p.title}</h1>
            <p className="text-[13px] text-foreground-muted">{p.status === "published" ? "Publicado" : "Rascunho"} · {p.enrolledCount} aluno{p.enrolledCount !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <CourseSectionList href={(id) => `${home}?secao=${id}`} detail={{ aulas: `${modulesCount} módulo${modulesCount !== 1 ? "s" : ""} · organizar aulas e PDFs` }} />
      </div>
    );
  }
  if (section !== "aulas") {
    return <div className="mx-auto max-w-2xl"><CourseSectionSoon id={section} backHref={home} /></div>;
  }

  const [modules, teachers] = [
    await loadEditorModules(course.id, session.user),
    await db.teacher.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ];

  return (
    <AdminCourseBoard
      header={{ courseId: course.id, productId: p.id, title: p.title, thumbnail: p.thumbnail, status: p.status, price: Number(p.price), enrolledCount: p.enrolledCount }}
      slug={p.slug}
      backHref={home}
      modules={modules}
      teachers={teachers}
      editInitial={{
        productId: p.id,
        title: p.title,
        shortDescription: p.shortDescription,
        description: p.description,
        price: Number(p.price),
        comparePrice: p.comparePrice ? Number(p.comparePrice) : undefined,
        categoryName: p.category?.name ?? "",
        level: p.level,
        thumbnail: p.thumbnail,
        heroColor: course.heroColor ?? "navy",
        pdfReleaseDays: course.pdfReleaseDays,
      }}
    />
  );
}
