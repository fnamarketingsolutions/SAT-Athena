"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAccountabilityStatus } from "@/hooks/use-accountability-status";

const EXEMPT_PREFIXES = [
  "/quest",
  "/dashboard",
  "/analytics",
  "/onboarding",
  "/checkout",
  "/profile",
  "/studio",
];

function isExempt(pathname: string) {
  return EXEMPT_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

export function QuestLockGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data, isLoading } = useAccountabilityStatus();

  const locked = Boolean(data?.enabled && data.locked);
  const exempt = isExempt(pathname);

  useEffect(() => {
    if (!locked || exempt || isLoading) return;
    router.replace("/quest");
  }, [locked, exempt, isLoading, router]);

  if (isLoading && !exempt) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  if (locked && !exempt) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
