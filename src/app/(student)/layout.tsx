import { requireArea } from "@/lib/auth-guards";
import { db } from "@/lib/db";
import { getStudyStats } from "@/lib/student-area";
import { StudentShell } from "@/components/student/student-shell";
import { ViewSwitch } from "@/components/layout/view-switch";
import { isStaffRole } from "@/lib/access";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const session = await requireArea("student");
  const stats = await getStudyStats(session.user.id);
  const unread = await db.notification.count({ where: { userId: session.user.id, isRead: false } });
  return (
    <StudentShell streak={stats.streak} unread={unread}>
      {children}
      {/* Equipe na "Visão do aluno": volta para o painel. */}
      {isStaffRole(session.user.role) && <ViewSwitch to="admin" />}
    </StudentShell>
  );
}
