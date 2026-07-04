"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const GET_STARTED_HREF = "/sign-up?redirect_url=%2Fcheckout%3Finterval%3Dmonthly";

export function MarketingNav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <header className="sticky top-0 z-50 border-b border-foreground/10 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link
          href="/"
          className="shrink-0 text-lg font-medium tracking-tight"
          onClick={() => setMobileOpen(false)}
        >
          athena<span className="text-amber-400">.</span>
        </Link>

        <nav className="hidden items-center gap-4 text-sm md:flex">
          <Link
            href="/pricing"
            className="text-muted-foreground transition hover:text-foreground"
          >
            Pricing
          </Link>
          <Link
            href="/sign-in"
            className="text-muted-foreground transition hover:text-foreground"
          >
            Sign in
          </Link>
          <ThemeToggle />
          <Link
            href={GET_STARTED_HREF}
            className="rounded-full border border-foreground/20 bg-foreground/90 px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-background transition hover:bg-foreground"
          >
            Get started
          </Link>
        </nav>

        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            className="rounded-md p-2 text-muted-foreground transition hover:bg-foreground/5 hover:text-foreground"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav
          className="border-t border-foreground/10 bg-background px-4 py-3 md:hidden"
          aria-label="Mobile"
        >
          <div className="flex flex-col gap-1">
            <Link
              href="/pricing"
              onClick={() => setMobileOpen(false)}
              className={cn(
                "rounded-lg px-3 py-2.5 text-sm font-medium transition",
                pathname === "/pricing"
                  ? "bg-foreground/10 text-foreground"
                  : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
              )}
            >
              Pricing
            </Link>
            <Link
              href="/sign-in"
              onClick={() => setMobileOpen(false)}
              className={cn(
                "rounded-lg px-3 py-2.5 text-sm font-medium transition",
                pathname.startsWith("/sign-in")
                  ? "bg-foreground/10 text-foreground"
                  : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
              )}
            >
              Sign in
            </Link>
            <Link
              href={GET_STARTED_HREF}
              onClick={() => setMobileOpen(false)}
              className="mt-2 rounded-full border border-foreground/20 bg-foreground/90 px-4 py-2.5 text-center text-xs font-medium uppercase tracking-wider text-background transition hover:bg-foreground"
            >
              Get started
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
