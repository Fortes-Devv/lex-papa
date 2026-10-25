import { redirect } from "next/navigation";
import { LOGIN_PATH } from "@/lib/login-redirect";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { AccountProfileForm } from "@/components/profile/account-profile-form";

export default async function AdminProfilePage() {
  const session = await auth();
  if (!session?.user) redirect(LOGIN_PATH);
  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect(LOGIN_PATH);

  return (
    <AccountProfileForm
      user={{
        name: user.name,
        email: user.email,
        avatar: user.avatar ?? undefined,
        bio: user.bio ?? "",
        phone: user.phone ?? "",
        location: user.location ?? "",
        roleLabel: user.role === "admin" ? "Administrador" : "Moderador",
      }}
    />
  );
}
