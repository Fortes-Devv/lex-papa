import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { StudentsClient, type StudentRow } from "./students-client";

export default async function TeacherStudentsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const enrollments = await db.enrollment.findMany({
    where: { product: { instructors: { some: { id: session.user.id } } } },
    orderBy: { enrolledAt: "desc" },
    include: { user: true, product: true },
  });

  const rows: StudentRow[] = enrollments.map((e) => ({
    id: e.id,
    name: e.user.name,
    email: e.user.email,
    avatar: e.user.avatar ?? undefined,
    courseTitle: e.product.title,
    progress: e.progress,
    status: e.status,
    lastAccessedAt: e.lastAccessedAt?.toISOString() ?? null,
  }));

  return <StudentsClient rows={rows} />;
}
