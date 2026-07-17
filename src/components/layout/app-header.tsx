"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";

type AppHeaderProps = {
  /** Hide menu button (e.g. onboarding focus mode) */
  minimal?: boolean;
  className?: string;
  onMenuClick?: () => void;
};

/** Slim mobile top bar. Desktop nav lives in the sidebar. */
export function AppHeader({
  minimal = false,
  className,
  onMenuClick,
}: AppHeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-[60] border-b border-border bg-background md:hidden",
        className
      )}
    >
      <div className="flex h-14 items-center justify-between gap-3 px-4">
        <div className="flex items-center gap-2">
          {!minimal && (
            <button
              type="button"
              className="rounded-md p-2 text-muted-foreground hover:bg-muted"
              aria-label="Open menu"
              onClick={onMenuClick}
            >
              <Menu className="h-5 w-5" />
            </button>
          )}
          <Link
            href="/dashboard"
            className="text-lg font-bold tracking-tight text-primary"
          >
            Athena
          </Link>
        </div>
      </div>
    </header>
  );
}
