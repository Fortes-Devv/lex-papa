import { cn, getInitials } from "@/lib/utils/cn";


interface AvatarProps {
  src?: string;
  name?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
  status?: "online" | "offline" | "away";
}

const sizeMap = {
  xs: "h-6 w-6 text-2xs",
  sm: "h-7 w-7 text-xs",
  md: "h-8 w-8 text-sm",
  lg: "h-10 w-10 text-base",
  xl: "h-14 w-14 text-lg",
  "2xl": "h-32 w-32 text-4xl",
};

const statusColors = { online: "bg-success", offline: "bg-foreground-subtle", away: "bg-warning" };

export function Avatar({ src, name, size = "md", className, status }: AvatarProps) {
  return (
    <div className={cn("relative shrink-0 inline-flex", className)}>
      {src ? (
        <img
          src={src}
          alt={name ?? "Avatar"}
          className={cn("rounded-full object-cover border border-border", sizeMap[size])}
        />
      ) : (
        <span
          className={cn(
            "rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center border border-primary/20",
            sizeMap[size]
          )}
        >
          {name ? getInitials(name) : "?"}
        </span>
      )}
      {status && (
        <span
          className={cn(
            "absolute bottom-0 right-0 rounded-full border-2 border-background",
            size === "xs" || size === "sm" ? "h-1.5 w-1.5" : size === "2xl" ? "h-5 w-5" : size === "xl" ? "h-3 w-3" : "h-2 w-2",
            statusColors[status]
          )}
        />
      )}
    </div>
  );
}

export function AvatarGroup({ users, max = 3, size = "sm" }: { users: { src?: string; name?: string }[]; max?: number; size?: AvatarProps["size"] }) {
  const visible = users.slice(0, max);
  const extra = users.length - max;
  return (
    <div className="flex -space-x-2">
      {visible.map((u, i) => (
        <Avatar key={i} src={u.src} name={u.name} size={size} className="ring-2 ring-background" />
      ))}
      {extra > 0 && (
        <span className={cn("rounded-full bg-muted text-muted-foreground font-medium flex items-center justify-center ring-2 ring-background text-xs", sizeMap[size])}>
          +{extra}
        </span>
      )}
    </div>
  );
}
