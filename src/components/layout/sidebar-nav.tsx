"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string | number;
  exact?: boolean;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

interface SidebarNavProps {
  sections: NavSection[];
  collapsed?: boolean;
}

export function SidebarNav({ sections, collapsed }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-4 px-2">
      {sections.map((section, si) => (
        <div key={si} className="flex flex-col gap-0.5">
          {section.title && !collapsed && (
            <p className="px-3 py-1 text-2xs font-semibold uppercase tracking-widest text-foreground-subtle">
              {section.title}
            </p>
          )}
          {section.items.map((item) => {
            const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "group flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-all duration-100",
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-foreground-muted hover:bg-muted hover:text-foreground",
                  collapsed && "justify-center px-2"
                )}
              >
                <span className={cn("shrink-0 h-4 w-4", isActive ? "text-primary" : "text-foreground-muted group-hover:text-foreground")}>
                  {item.icon}
                </span>
                {!collapsed && (
                  <>
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge !== undefined && (
                      <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-2xs font-semibold text-primary min-w-[1.25rem] text-center">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
