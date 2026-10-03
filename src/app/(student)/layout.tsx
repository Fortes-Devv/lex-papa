import { requireArea } from "@/lib/auth-guards";
import { db } from "@/lib/db";
import { getStudyStats } from "@/lib/student-area";
import { StudentShell } from "@/components/student/student-shell";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const session = await requireArea("student");
  const stats = await getStudyStats(session.user.id);
  const unread = await db.notification.count({ where: { userId: session.user.id, isRead: false } });
  return <StudentShell streak={stats.streak} unread={unread}>{children}</StudentShell>;
}
