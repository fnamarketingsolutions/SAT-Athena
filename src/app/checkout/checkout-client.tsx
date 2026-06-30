"use client";

import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { useStartCheckout } from "@/hooks/use-billing";
import type { BillingInterval } from "@/lib/stripe/plans";

export function CheckoutClient({ interval }: { interval: BillingInterval }) {
  const { mutate, isError, error } = useStartCheckout();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    (async () => {
      await fetch("/api/user/sync", { method: "POST" }).catch(() => null);
      mutate(interval);
    })();
  }, [interval, mutate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-foreground">
      <Loader2 className="h-8 w-8 animate-spin text-amber-400/90" />
      <p className="font-mono-hud text-[11px] tracking-[0.25em] text-muted-foreground">
        REDIRECTING TO STRIPE CHECKOUT
      </p>
      {isError && (
        <p className="max-w-md text-center text-sm text-red-400">
          {(error as Error).message}
        </p>
      )}
    </div>
  );
}
