import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { Button } from "./button";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick?: () => void; href?: string };
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 text-center", className)}>
      {icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-foreground-muted">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {description && <p className="mt-1 text-sm text-foreground-muted max-w-xs">{description}</p>}
      {action && (
        action.href ? (
          <Link href={action.href}>
            <Button size="sm" className="mt-4">{action.label}</Button>
          </Link>
        ) : (
          <Button onClick={action.onClick} size="sm" className="mt-4">{action.label}</Button>
        )
      )}
    </div>
  );
}
