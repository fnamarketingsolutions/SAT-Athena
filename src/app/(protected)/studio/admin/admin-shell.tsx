"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";

const PLATFORM_NAV = [
  { label: "Overview", href: "/studio/admin/overview" },
  { label: "Users", href: "/studio/admin/users" },
  { label: "Subscriptions", href: "/studio/admin/subscriptions" },
  { label: "Curriculum", href: "/studio/admin/curriculum" },
];

export function StudioAdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="w-56 border-r border-border bg-background flex flex-col py-6 px-4 shrink-0">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-8 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to app
        </Link>

        <NavSection title="Platform" items={PLATFORM_NAV} pathname={pathname} />

        <div className="mt-auto pt-6 border-t border-border">
          <ThemeToggle />
        </div>
      </aside>

      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}

function NavSection({
  title,
  items,
  pathname,
  className,
  disabled,
}: {
  title: string;
  items: { label: string; href: string }[];
  pathname: string | null;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <div className={className}>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold mb-3 px-2">
        {title}
      </p>
      <nav className="space-y-1">
        {items.map((item) => {
          const isActive =
            !disabled &&
            (pathname === item.href ||
              (item.href !== "#" && pathname?.startsWith(item.href + "/")));
          return (
            <Link
              key={item.label}
              href={disabled ? "#" : item.href}
              className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                disabled
                  ? "text-muted-foreground/70 cursor-not-allowed"
                  : isActive
                    ? "bg-card text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-card/50"
              }`}
              onClick={(e) => {
                if (disabled) e.preventDefault();
              }}
            >
              {item.label}
              {disabled && (
                <span className="ml-2 text-[10px] text-muted-foreground/70">Soon</span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
