import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { AccountProfileForm } from "@/components/profile/account-profile-form";

export default async function TeacherProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect("/login");

  return (
    <AccountProfileForm
      user={{
        name: user.name,
        email: user.email,
        avatar: user.avatar ?? undefined,
        bio: user.bio ?? "",
        phone: user.phone ?? "",
        location: user.location ?? "",
        roleLabel: "Professor",
      }}
    />
  );
}
