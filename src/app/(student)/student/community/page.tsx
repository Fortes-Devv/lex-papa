"use client";
import { useState } from "react";
import { Heart, MessageSquare, Send, Flag, Pin } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { MOCK_POSTS } from "@/lib/mock/data";
import { useCurrentUser } from "@/lib/store/hooks";
import { formatRelativeDate } from "@/lib/utils/cn";
import { cn } from "@/lib/utils/cn";

export default function StudentCommunityPage() {
  const user = useCurrentUser();
  const { success } = useToast();
  const [posts, setPosts] = useState(MOCK_POSTS);
  const [newPost, setNewPost] = useState("");

  function handleLike(postId: string) {
    setPosts((prev) => prev.map((p) =>
      p.id === postId ? { ...p, isLiked: !p.isLiked, likesCount: p.isLiked ? p.likesCount - 1 : p.likesCount + 1 } : p
    ));
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Comunidade</h1>
        <p className="text-sm text-foreground-muted mt-0.5">Conecte-se com outros alunos e professores</p>
      </div>

      {/* New post */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="flex gap-3">
          <Avatar src={user.avatar} name={user.name} size="sm" />
          <textarea
            className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground-subtle resize-none min-h-[80px] focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Compartilhe algo com a comunidade..."
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
          />
        </div>
        <div className="flex justify-end">
          <Button size="sm" leftIcon={<Send className="h-3.5 w-3.5" />} onClick={() => { if (newPost.trim()) { success("Post publicado!"); setNewPost(""); } }}>
            Publicar
          </Button>
        </div>
      </div>

      {/* Posts */}
      <div className="space-y-4">
        {posts.map((post) => (
          <div key={post.id} className="rounded-lg border border-border bg-card p-4 space-y-3">
            {post.isPinned && (
              <div className="flex items-center gap-1.5 text-xs text-warning font-medium">
                <Pin className="h-3 w-3" /> Fixado pelo professor
              </div>
            )}
            <div className="flex items-start gap-3">
              <Avatar src={post.author?.avatar} name={post.author?.name} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{post.author?.name}</span>
                  {post.author?.role === "teacher" && <Badge variant="success">Professor</Badge>}
                  <span className="text-xs text-foreground-muted ml-auto">{formatRelativeDate(post.createdAt)}</span>
                </div>
                <p className="text-sm text-foreground mt-1 leading-relaxed">{post.content}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 pt-1 border-t border-border">
              <button
                onClick={() => handleLike(post.id)}
                className={cn("flex items-center gap-1.5 text-xs transition-colors", post.isLiked ? "text-destructive font-medium" : "text-foreground-muted hover:text-foreground")}
              >
                <Heart className={cn("h-3.5 w-3.5", post.isLiked && "fill-current")} />
                {post.likesCount}
              </button>
              <button className="flex items-center gap-1.5 text-xs text-foreground-muted hover:text-foreground transition-colors">
                <MessageSquare className="h-3.5 w-3.5" />
                {post.commentsCount} comentários
              </button>
              <button className="ml-auto flex items-center gap-1 text-xs text-foreground-subtle hover:text-foreground transition-colors">
                <Flag className="h-3 w-3" /> Reportar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
