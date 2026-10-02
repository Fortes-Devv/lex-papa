import { NavShell } from "@/components/layout/nav-shell/nav-shell";
import { requireArea } from "@/lib/auth-guards";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const session = await requireArea("teacher");
  return (
    <NavShell area="teacher" user={{ name: session.user.name ?? "Professor", roleLabel: "Professor" }}>
      {children}
    </NavShell>
  );
}
