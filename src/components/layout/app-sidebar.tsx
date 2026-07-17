"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { KeyRound, LogOut, Moon, Sun, X } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { learnerNavItems, adminNavItem } from "@/components/layout/nav-items";
import { useIsAthenaAdmin } from "@/hooks/use-is-admin";
import { useAuthUser } from "@/components/auth/auth-context";
import { isSupabaseAuth } from "@/lib/auth/provider";

export const SIDEBAR_WIDTH = "15rem";

type AppSidebarProps = {
  open: boolean;
  onClose: () => void;
};

export function AppSidebar({ open, onClose }: AppSidebarProps) {
  const pathname = usePathname();
  const { isAdmin } = useIsAthenaAdmin();
  const { user, signOut } = useAuthUser();
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Close mobile drawer on route change
  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const initial = (user?.displayName || user?.email || "?").charAt(0).toUpperCase();

  const navLinkClass = (active: boolean) =>
    cn(
      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
      active
        ? "bg-primary/10 text-primary"
        : "text-muted-foreground hover:bg-muted hover:text-foreground"
    );

  const sidebar = (
    <aside
      className="flex h-full w-[15rem] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground"
      style={{ width: SIDEBAR_WIDTH }}
    >
      <div className="flex h-14 items-center justify-between border-b border-border px-4">
        <Link
          href="/dashboard"
          className="text-lg font-bold tracking-tight text-primary"
          onClick={onClose}
        >
          Athena
        </Link>
        <button
          type="button"
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted md:hidden"
          aria-label="Close sidebar"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Navigate
        </p>
        {learnerNavItems.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={navLinkClass(active)}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
        {isAdmin && (
          <Link
            href={adminNavItem.href}
            onClick={onClose}
            className={navLinkClass(pathname.startsWith("/studio/admin"))}
          >
            <adminNavItem.icon className="h-4 w-4 shrink-0" />
            {adminNavItem.label}
          </Link>
        )}
      </nav>

      <div className="space-y-1 border-t border-border p-3">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Account
        </p>

        {user && (
          <div className="mb-2 flex items-center gap-3 rounded-lg px-3 py-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted text-xs font-semibold">
              {user.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.imageUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                initial
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {user.displayName || "Account"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {user.email}
              </p>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() =>
            setTheme(resolvedTheme === "dark" ? "light" : "dark")
          }
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {mounted && resolvedTheme === "dark" ? (
            <Sun className="h-4 w-4 shrink-0" />
          ) : (
            <Moon className="h-4 w-4 shrink-0" />
          )}
          Toggle theme
        </button>

        {isSupabaseAuth() && (
          <Link
            href="/account/password"
            onClick={onClose}
            className={navLinkClass(pathname.startsWith("/account/password"))}
          >
            <KeyRound className="h-4 w-4 shrink-0" />
            Set password
          </Link>
        )}

        <button
          type="button"
          onClick={() => signOut()}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop: fixed sidebar */}
      <div className="fixed inset-y-0 left-0 z-[70] hidden md:block">{sidebar}</div>

      {/* Mobile: overlay drawer */}
      {open && (
        <div className="fixed inset-0 z-[70] md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-background/60"
            aria-label="Close sidebar"
            onClick={onClose}
          />
          <div className="absolute inset-y-0 left-0 shadow-xl">{sidebar}</div>
        </div>
      )}
    </>
  );
}
