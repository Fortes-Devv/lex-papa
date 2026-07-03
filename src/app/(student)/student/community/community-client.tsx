"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, MessageSquare, Send, Pin } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { createPost, togglePostLike } from "@/lib/actions/community";
import { formatRelativeDate, cn } from "@/lib/utils/cn";

export interface CommunityPost {
  id: string;
  authorName: string;
  authorAvatar?: string;
  authorRole: string;
  content: string;
  isPinned: boolean;
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  createdAt: string;
}

export function CommunityClient({ posts: initial, currentUser }: { posts: CommunityPost[]; currentUser: { name: string; avatar?: string } }) {
  const { success, error } = useToast();
  const router = useRouter();
  const [posts, setPosts] = useState(initial);
  const [newPost, setNewPost] = useState("");
  const [posting, setPosting] = useState(false);

  async function handlePublish() {
    if (!newPost.trim()) return;
    setPosting(true);
    const result = await createPost(newPost);
    setPosting(false);
    if (!result.success) { error(result.error); return; }
    success("Post publicado!");
    setNewPost("");
    router.refresh();
  }

  async function handleLike(postId: string) {
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, isLiked: !p.isLiked, likesCount: p.isLiked ? p.likesCount - 1 : p.likesCount + 1 } : p));
    await togglePostLike(postId);
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Comunidade</h1>
        <p className="text-sm text-foreground-muted mt-0.5">Conecte-se com outros alunos e professores</p>
      </div>

      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="flex gap-3">
          <Avatar src={currentUser.avatar} name={currentUser.name} size="sm" />
          <textarea
            className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground-subtle resize-none min-h-[80px] focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Compartilhe algo com a comunidade..."
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
          />
        </div>
        <div className="flex justify-end">
          <Button size="sm" leftIcon={<Send className="h-3.5 w-3.5" />} loading={posting} onClick={handlePublish}>Publicar</Button>
        </div>
      </div>

      <div className="space-y-4">
        {posts.length === 0 && (
          <p className="text-sm text-foreground-muted text-center py-8">Seja o primeiro a publicar algo na comunidade.</p>
        )}
        {posts.map((post) => (
          <div key={post.id} className="rounded-lg border border-border bg-card p-4 space-y-3">
            {post.isPinned && (
              <div className="flex items-center gap-1.5 text-xs text-warning font-medium">
                <Pin className="h-3 w-3" /> Fixado pelo professor
              </div>
            )}
            <div className="flex items-start gap-3">
              <Avatar src={post.authorAvatar} name={post.authorName} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{post.authorName}</span>
                  {post.authorRole === "teacher" && <Badge variant="success">Professor</Badge>}
                  {(post.authorRole === "admin" || post.authorRole === "moderator") && <Badge variant="default">Equipe</Badge>}
                  <span className="text-xs text-foreground-muted ml-auto">{formatRelativeDate(post.createdAt)}</span>
                </div>
                <p className="text-sm text-foreground mt-1 leading-relaxed whitespace-pre-wrap">{post.content}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 pt-1 border-t border-border">
              <button onClick={() => handleLike(post.id)} className={cn("flex items-center gap-1.5 text-xs transition-colors", post.isLiked ? "text-destructive font-medium" : "text-foreground-muted hover:text-foreground")}>
                <Heart className={cn("h-3.5 w-3.5", post.isLiked && "fill-current")} />
                {post.likesCount}
              </button>
              <span className="flex items-center gap-1.5 text-xs text-foreground-muted">
                <MessageSquare className="h-3.5 w-3.5" />
                {post.commentsCount} comentários
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
