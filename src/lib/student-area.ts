import { db } from "@/lib/db";
import { isEnrollmentActive } from "@/lib/access";
import { disciplineName } from "@/lib/discipline";

export { disciplineName };

// Dados da área do aluno (modelos 7 e 8): curso com progresso, disciplinas,
// "continuar assistindo" e estatísticas de estudo. Consultas em sequência (Neon).

const TZ = "America/Fortaleza";

// Dia local (Fortaleza) como Date à meia-noite UTC — formato da coluna @db.Date.
export function dayKey(d = new Date()): Date {
  const [y, m, day] = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day));
}
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);
// Segunda-feira da semana atual.
export function weekStart(today = dayKey()): Date {
  return addDays(today, -((today.getUTCDay() + 6) % 7));
}

// ── Curso do aluno ─────────────────────────────────────────────────────────

export interface OutlineLesson {
  id: string;
  title: string;
  type: string;
  duration: number | null;
  isCompleted: boolean;
  position: number; // segundos onde parou
  hasVideo: boolean;
  isPdf: boolean; // aula de material (sem vídeo)
  materials: number; // PDFs da aula (o da aula + anexos)
  downloaded: boolean;
}
export interface OutlineModule {
  id: string;
  number: number;
  title: string;
  coverImage: string | null;
  instructorName: string | null;
  kind: "aula" | "pdf";
  lessons: OutlineLesson[];
  done: number;
  total: number;
}
export interface Discipline {
  key: string;
  name: string;
  instructorName: string | null;
  modules: OutlineModule[];
  done: number;
  total: number;
  percent: number;
  seconds: number;
}
export interface CourseOutline {
  courseId: string;
  productId: string;
  title: string;
  slug: string;
  thumbnail: string;
  enrolled: boolean;
  progress: number;
  modules: OutlineModule[];
  disciplines: Discipline[];
}

const disciplineKey = (name: string) => name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ");

export async function loadCourseOutline(userId: string, courseId: string): Promise<CourseOutline | null> {
  const course = await db.course.findUnique({
    where: { id: courseId },
    include: {
      product: { select: { id: true, title: true, slug: true, thumbnail: true } },
      modules: {
        where: { isPublished: true, section: "aulas" },
        orderBy: { order: "asc" },
        include: {
          module: {
            include: {
              instructor: { select: { name: true } },
              lessons: {
                where: { status: "published" },
                orderBy: { order: "asc" },
                select: { id: true, title: true, type: true, duration: true, videoUrl: true, videoPublicId: true, pdfUrl: true, _count: { select: { materials: true } } },
              },
            },
          },
        },
      },
    },
  });
  if (!course) return null;
  const enrollment = await db.enrollment.findUnique({ where: { userId_productId: { userId, productId: course.productId } } });
  const progressRows = await db.lessonProgress.findMany({ where: { userId, courseId }, select: { lessonId: true, isCompleted: true, positionSeconds: true } });
  const lessonIds = course.modules.flatMap((cm) => cm.module.lessons.map((l) => l.id));
  const downloads = lessonIds.length
    ? await db.downloadEvent.findMany({ where: { userId, lessonId: { in: lessonIds } }, select: { lessonId: true }, distinct: ["lessonId"] })
    : [];
  const progress = new Map(progressRows.map((p) => [p.lessonId, p]));
  const downloaded = new Set(downloads.map((d) => d.lessonId));

  const modules: OutlineModule[] = course.modules.map(({ module: m }, i) => {
    const lessons = m.lessons.map<OutlineLesson>((l) => {
      const hasVideo = Boolean(l.videoUrl || l.videoPublicId);
      return {
        id: l.id,
        title: l.title,
        type: l.type,
        duration: l.duration,
        isCompleted: progress.get(l.id)?.isCompleted ?? false,
        position: progress.get(l.id)?.positionSeconds ?? 0,
        hasVideo,
        isPdf: l.type === "pdf" || (!hasVideo && !!l.pdfUrl),
        materials: (l.pdfUrl ? 1 : 0) + l._count.materials,
        downloaded: downloaded.has(l.id),
      };
    });
    return {
      id: m.id,
      number: i + 1,
      title: m.title,
      coverImage: m.coverImage,
      instructorName: m.instructor?.name ?? null,
      kind: lessons.length > 0 && lessons.every((l) => l.isPdf) ? "pdf" : "aula",
      lessons,
      done: lessons.filter((l) => l.isCompleted).length,
      total: lessons.length,
    };
  });

  const groups = new Map<string, Discipline>();
  for (const mod of modules) {
    const name = disciplineName(mod.title);
    const key = disciplineKey(name);
    const g = groups.get(key) ?? { key, name, instructorName: mod.instructorName, modules: [], done: 0, total: 0, percent: 0, seconds: 0 };
    g.modules.push(mod);
    g.done += mod.done;
    g.total += mod.total;
    g.seconds += mod.lessons.reduce((s, l) => s + (l.duration ?? 0), 0);
    groups.set(key, g);
  }
  const disciplines = [...groups.values()].map((g) => ({ ...g, percent: g.total ? Math.round((g.done / g.total) * 100) : 0 }));

  const total = modules.reduce((s, m) => s + m.total, 0);
  const done = modules.reduce((s, m) => s + m.done, 0);
  return {
    courseId: course.id,
    productId: course.product.id,
    title: course.product.title,
    slug: course.product.slug,
    thumbnail: course.product.thumbnail,
    enrolled: isEnrollmentActive(enrollment),
    progress: total ? Math.round((done / total) * 100) : 0,
    modules,
    disciplines,
  };
}

// Cursos com matrícula válida, do mais recente acessado para o mais antigo.
export async function getStudentCourses(userId: string) {
  const enrollments = await db.enrollment.findMany({
    where: { userId },
    orderBy: [{ lastAccessedAt: { sort: "desc", nulls: "last" } }, { enrolledAt: "desc" }],
    include: { product: { select: { id: true, title: true, thumbnail: true, slug: true, course: { select: { id: true } } } } },
  });
  return enrollments
    .filter((e) => isEnrollmentActive(e) && e.product.course)
    .map((e) => ({ courseId: e.product.course!.id, productId: e.productId, title: e.product.title, thumbnail: e.product.thumbnail, slug: e.product.slug, progress: e.progress }));
}

// Escolhe o curso pedido (se o aluno tem acesso) ou o último acessado.
export async function resolveStudentCourse(userId: string, requested?: string) {
  const courses = await getStudentCourses(userId);
  const current = courses.find((c) => c.courseId === requested) ?? courses[0] ?? null;
  return { courses, current };
}

// ── Continuar assistindo / próximas ────────────────────────────────────────

export interface NextUp {
  courseId: string;
  lessonId: string;
  lessonTitle: string;
  moduleTitle: string;
  moduleNumber: number;
  instructorName: string | null;
  lessonIndex: number; // posição no módulo (1..n)
  moduleLessons: number;
  position: number;
  duration: number | null;
  isPdf: boolean;
}

// Aula parada no meio (mais recente) ou, se não houver, a primeira não concluída. Depois, as seguintes.
export function pickNextUp(outline: CourseOutline, lastLessonId: string | null, limit = 3): { current: NextUp | null; upcoming: NextUp[] } {
  const flat = outline.modules.flatMap((m) => m.lessons.map((l, i) => ({ m, l, i })));
  const toNext = ({ m, l, i }: (typeof flat)[number]): NextUp => ({
    courseId: outline.courseId, lessonId: l.id, lessonTitle: l.title, moduleTitle: m.title, moduleNumber: m.number,
    instructorName: m.instructorName, lessonIndex: i + 1, moduleLessons: m.lessons.length, position: l.position, duration: l.duration, isPdf: l.isPdf,
  });
  let idx = lastLessonId ? flat.findIndex((x) => x.l.id === lastLessonId && !x.l.isCompleted) : -1;
  if (idx < 0) idx = flat.findIndex((x) => !x.l.isCompleted);
  if (idx < 0) return { current: null, upcoming: [] };
  const upcoming = flat.slice(idx + 1).filter((x) => !x.l.isCompleted).slice(0, limit).map(toNext);
  return { current: toNext(flat[idx]), upcoming };
}

// Última aula tocada (com posição salva) no curso.
export async function lastWatchedLesson(userId: string, courseId: string) {
  const row = await db.lessonProgress.findFirst({
    where: { userId, courseId, positionSeconds: { gt: 0 } },
    orderBy: { updatedAt: "desc" },
    select: { lessonId: true },
  });
  return row?.lessonId ?? null;
}

// ── Estatísticas de estudo ─────────────────────────────────────────────────

export async function getStudyStats(userId: string) {
  const today = dayKey();
  const monday = weekStart(today);
  const user = await db.user.findUnique({ where: { id: userId }, select: { weeklyGoalMinutes: true } });
  const days = await db.studyDay.findMany({ where: { userId }, orderBy: { date: "asc" }, select: { date: true, seconds: true } });
  const xp = await db.userXP.findUnique({ where: { userId }, select: { streak: true, totalXp: true, lastActivityDate: true } });

  const weekSeconds = days.filter((d) => d.date >= monday).reduce((s, d) => s + d.seconds, 0);
  const lastWeekSeconds = days.filter((d) => d.date >= addDays(monday, -7) && d.date < monday).reduce((s, d) => s + d.seconds, 0);
  const totalSeconds = days.reduce((s, d) => s + d.seconds, 0);
  const daysElapsed = Math.round((today.getTime() - monday.getTime()) / 86400000) + 1;

  // Sequência: dias seguidos com estudo (vídeo) até hoje/ontem; recorde = maior sequência.
  const studied = new Set(days.filter((d) => d.seconds > 0).map((d) => d.date.getTime()));
  let record = 0;
  let run = 0;
  let prev: number | null = null;
  for (const t of [...studied].sort((a, b) => a - b)) {
    run = prev !== null && t - prev === 86400000 ? run + 1 : 1;
    record = Math.max(record, run);
    prev = t;
  }
  let streak = 0;
  for (let d = studied.has(today.getTime()) ? today : addDays(today, -1); studied.has(d.getTime()); d = addDays(d, -1)) streak++;
  // A sequência de XP (aulas concluídas) também conta: vale a maior das duas.
  streak = Math.max(streak, xp?.streak ?? 0);
  record = Math.max(record, streak);

  const week = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(monday, i);
    return { date: d, seconds: days.find((x) => x.date.getTime() === d.getTime())?.seconds ?? 0, isToday: d.getTime() === today.getTime(), future: d > today };
  });

  return {
    goalMinutes: user?.weeklyGoalMinutes ?? 360,
    weekSeconds,
    lastWeekSeconds,
    totalSeconds,
    avgPerDaySeconds: Math.round(weekSeconds / daysElapsed),
    streak,
    record,
    week,
  };
}
