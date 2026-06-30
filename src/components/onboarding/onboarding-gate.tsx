"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

const EXEMPT_PREFIXES = ["/onboarding", "/checkout"];

export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const redirected = useRef(false);

  const exempt = EXEMPT_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  useEffect(() => {
    if (exempt || redirected.current) return;
    redirected.current = true;
    router.replace("/onboarding");
  }, [exempt, router]);

  if (!exempt) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  return <main>{children}</main>;
}
