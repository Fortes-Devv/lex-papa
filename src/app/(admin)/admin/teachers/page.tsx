export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { requireArea } from "@/lib/auth-guards";
import { PageHeader } from "@/components/admin/page-kit";
import { TeachersClient } from "./teachers-client";

// Professores (só crédito nos módulos). Não são usuários: não aparecem em Usuários e não fazem login.
export default async function AdminTeachersPage() {
  await requireArea("admin");
  const teachers = await db.teacher.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, bio: true, avatar: true, modules: { select: { title: true } } },
  });
  return (
    <div>
      <PageHeader title="Professores" subtitle={`${teachers.length} cadastrado${teachers.length !== 1 ? "s" : ""} · aparecem como crédito nos módulos e na página do curso`} />
      <TeachersClient teachers={teachers.map((t) => ({ id: t.id, name: t.name, bio: t.bio ?? "", avatar: t.avatar ?? "", modules: t.modules.map((m) => m.title) }))} />
    </div>
  );
}
