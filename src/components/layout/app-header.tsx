"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { NavUser } from "@/components/layout/nav-user";
import { learnerNavItems, adminNavItem } from "@/components/layout/nav-items";
import { useIsAthenaAdmin } from "@/hooks/use-is-admin";

type AppHeaderProps = {
  /** Hide center nav links (e.g. onboarding focus mode) */
  minimal?: boolean;
  className?: string;
};

export function AppHeader({ minimal = false, className }: AppHeaderProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAdmin } = useIsAthenaAdmin();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isImmersiveRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/mentor") ||
    pathname.startsWith("/onboarding") ||
    pathname.includes("/micro-lesson");

  /** Glass-dark header only on immersive routes in dark mode. Light theme uses the standard header everywhere. */
  const immersiveChrome =
    isImmersiveRoute && mounted && resolvedTheme === "dark";

  return (
    <header
      className={cn(
        "z-[60] border-b",
        immersiveChrome
          ? "fixed inset-x-0 top-0 border-white/10 bg-black/40 backdrop-blur-md"
          : "sticky top-0 bg-background/95 backdrop-blur-md border-border",
        className
      )}
    >
      <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between gap-4 px-4 md:px-6">
        <div className="flex items-center gap-3">
          {!minimal && (
            <button
              type="button"
              className="rounded-md p-2 text-muted-foreground hover:bg-accent md:hidden"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              onClick={() => setMobileOpen((v) => !v)}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          )}
          <Link
            href="/dashboard"
            className={cn(
              "text-lg font-bold tracking-tight",
              immersiveChrome ? "text-white" : "text-athena-navy dark:text-athena-amber"
            )}
          >
            Athena
          </Link>
        </div>

        {!minimal && (
          <nav className="hidden items-center gap-1 md:flex">
            {learnerNavItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                    active
                      ? immersiveChrome
                        ? "bg-white/15 text-white"
                        : "bg-accent text-accent-foreground"
                      : immersiveChrome
                        ? "text-white/70 hover:bg-white/10 hover:text-white"
                        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
            {isAdmin && (
              <Link
                href={adminNavItem.href}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  pathname.startsWith("/studio/admin")
                    ? immersiveChrome
                      ? "bg-white/15 text-white"
                      : "bg-accent text-accent-foreground"
                    : immersiveChrome
                      ? "text-white/70 hover:bg-white/10 hover:text-white"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
              >
                {adminNavItem.label}
              </Link>
            )}
          </nav>
        )}

        <NavUser immersive={immersiveChrome} />
      </div>

      {!minimal && mobileOpen && (
        <nav className="border-t border-border bg-background px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {learnerNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "rounded-lg px-3 py-2.5 text-sm font-medium",
                  pathname.startsWith(item.href)
                    ? "bg-accent text-accent-foreground"
                    : "text-foreground hover:bg-accent/50"
                )}
              >
                {item.label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                href={adminNavItem.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "rounded-lg px-3 py-2.5 text-sm font-medium",
                  pathname.startsWith("/studio/admin")
                    ? "bg-accent text-accent-foreground"
                    : "text-foreground hover:bg-accent/50"
                )}
              >
                {adminNavItem.label}
              </Link>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
