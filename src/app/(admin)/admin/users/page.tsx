export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { UsersClient } from "./users-client";
import type { User } from "@/lib/types";

export default async function AdminUsersPage() {
  const rows = await db.user.findMany({ orderBy: { createdAt: "desc" } });

  const users: User[] = rows.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    avatar: u.avatar ?? undefined,
    role: u.role,
    status: u.status,
    bio: u.bio ?? undefined,
    phone: u.phone ?? undefined,
    location: u.location ?? undefined,
    website: u.website ?? undefined,
    twoFactorEnabled: u.twoFactorEnabled,
    emailVerified: u.emailVerified,
    oauthProviders: [],
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
    lastLoginAt: u.lastLoginAt?.toISOString(),
  }));

  return <UsersClient initialUsers={users} />;
}
