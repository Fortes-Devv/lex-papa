import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { LibraryClient, type LibraryEnrollment } from "./library-client";

export default async function StudentLibraryPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const enrollments = await db.enrollment.findMany({
    where: { userId: session.user.id },
    orderBy: { lastAccessedAt: "desc" },
    include: { product: { include: { course: true } } },
  });

  const items: LibraryEnrollment[] = enrollments.map((e) => ({
    id: e.id,
    productId: e.productId,
    courseId: e.product.course?.id ?? null,
    title: e.product.title,
    thumbnail: e.product.thumbnail,
    progress: e.progress,
    status: e.status,
    lastAccessedAt: e.lastAccessedAt?.toISOString() ?? null,
  }));

  return <LibraryClient enrollments={items} />;
}
