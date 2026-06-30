import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

export function MarketingNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-foreground/10 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="text-lg font-medium tracking-tight">
          athena<span className="text-amber-400">.</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
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
            href="/sign-up?redirect_url=%2Fcheckout%3Finterval%3Dmonthly"
            className="rounded-full border border-foreground/20 bg-foreground/90 px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-background transition hover:bg-foreground"
          >
            Get started
          </Link>
        </nav>
      </div>
    </header>
  );
}
