"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * After Stripe Checkout, reconcile subscription state when webhooks are not
 * wired (common in local dev). Removes session_id from the URL once done.
 */
export function VerifyCheckoutReturn() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const started = useRef(false);

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    if (!sessionId || started.current) return;
    started.current = true;

    (async () => {
      try {
        await fetch("/api/billing/verify-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
      } catch {
        // Webhook may still grant access; onboarding page handles paywall.
      } finally {
        const next = new URL(window.location.href);
        next.searchParams.delete("session_id");
        router.replace(next.pathname + next.search);
      }
    })();
  }, [searchParams, router]);

  return null;
}
