import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { CommunityClient, type CommunityPost } from "./community-client";

export default async function StudentCommunityPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = session.user.id;

  const posts = await db.post.findMany({
    where: { status: "published" },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    take: 50,
    include: {
      author: true,
      _count: { select: { likes: true, comments: true } },
      likes: { where: { userId }, select: { id: true } },
    },
  });

  const dtos: CommunityPost[] = posts.map((p) => ({
    id: p.id,
    authorName: p.author.name,
    authorAvatar: p.author.avatar ?? undefined,
    authorRole: p.author.role,
    content: p.content,
    isPinned: p.isPinned,
    likesCount: p._count.likes,
    commentsCount: p._count.comments,
    isLiked: p.likes.length > 0,
    createdAt: p.createdAt.toISOString(),
  }));

  return (
    <CommunityClient
      posts={dtos}
      currentUser={{ name: session.user.name ?? "", avatar: session.user.image ?? undefined }}
    />
  );
}
