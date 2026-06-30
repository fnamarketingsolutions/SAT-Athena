"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { useStartCheckout } from "@/hooks/use-billing";
import { useAuthUser } from "@/components/auth/auth-context";
import {
  FAMILY_PLAN,
  formatPrice,
  type BillingInterval,
} from "@/lib/stripe/plans";
import {
  checkoutPath,
  signUpForCheckoutPath,
} from "@/lib/stripe/checkout-paths";

const PERKS = [
  "Adaptive daily quests tuned to your weak skills",
  "AI micro-lessons with an interactive whiteboard",
  "Voice tutor for Reading, Writing, and Math",
  "Full Digital SAT practice tests + score tracking",
  "Flashcards, podcasts, and personalized drills",
];

type PricingPlansProps = {
  /** When true, logged-out users go to sign-up → checkout. */
  paymentFirst?: boolean;
  className?: string;
};

export function PricingPlans({
  paymentFirst = true,
  className = "",
}: PricingPlansProps) {
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const checkout = useStartCheckout();
  const { user } = useAuthUser();

  const monthly = formatPrice(FAMILY_PLAN.prices.monthly.unitAmount);
  const yearly = formatPrice(FAMILY_PLAN.prices.yearly.unitAmount);

  const ctaHref = paymentFirst
    ? signUpForCheckoutPath(interval)
    : "/sign-up";

  const handleSubscribe = () => {
    if (user) {
      checkout.mutate(interval);
      return;
    }
    if (!paymentFirst) return;
    window.location.href = ctaHref;
  };

  return (
    <section className={`px-6 py-20 ${className}`} id="pricing">
      <div className="mx-auto max-w-4xl text-center">
        <p className="font-mono-hud hud-dim text-[11px] tracking-[0.3em]">
          ATHENA FAMILY
        </p>
        <h2 className="mt-3 text-3xl font-light tracking-tight text-foreground md:text-4xl">
          One plan. Everything included.
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
          Start with a secure Stripe checkout. Cancel anytime from your billing
          portal.
        </p>

        <ul className="mx-auto mt-10 grid max-w-2xl gap-3 text-left sm:grid-cols-2">
          {PERKS.map((p) => (
            <li
              key={p}
              className="flex items-start gap-2.5 text-sm text-foreground/85"
            >
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400/90" />
              {p}
            </li>
          ))}
        </ul>

        <div className="mx-auto mt-10 max-w-md rounded-2xl border border-foreground/12 bg-foreground/[0.03] p-6">
          <div className="mx-auto mb-4 flex w-full max-w-[260px] rounded-full border border-foreground/12 p-1">
            {(["monthly", "yearly"] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setInterval(opt)}
                disabled={checkout.isPending}
                className={`font-mono-hud flex-1 rounded-full py-1.5 text-[11px] tracking-[0.15em] transition ${
                  interval === opt
                    ? "bg-foreground/90 text-background"
                    : "text-foreground/55 hover:text-foreground"
                }`}
              >
                {opt === "monthly" ? "MONTHLY" : "YEARLY"}
              </button>
            ))}
          </div>

          <div className="text-3xl font-light text-foreground">
            {interval === "monthly" ? (
              <>
                {monthly}
                <span className="text-lg text-muted-foreground">/mo</span>
              </>
            ) : (
              <>
                {yearly}
                <span className="text-lg text-muted-foreground">/yr</span>
                <span className="ml-2 align-middle text-xs text-emerald-400/90">
                  Save 38%
                </span>
              </>
            )}
          </div>

          {user ? (
            <button
              type="button"
              onClick={handleSubscribe}
              disabled={checkout.isPending}
              className="font-mono-hud mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full border border-foreground/20 bg-foreground/90 text-background transition hover:bg-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              {checkout.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> REDIRECTING
                </>
              ) : (
                "CONTINUE TO CHECKOUT"
              )}
            </button>
          ) : (
            <Link
              href={ctaHref}
              className="font-mono-hud mt-5 flex h-12 w-full items-center justify-center rounded-full border border-foreground/20 bg-foreground/90 text-background transition hover:bg-foreground"
            >
              GET STARTED
            </Link>
          )}

          {user && !checkout.isPending && (
            <p className="mt-3 text-xs text-muted-foreground">
              Signed in as {user.email}. You&apos;ll be sent to{" "}
              {checkoutPath(interval)}.
            </p>
          )}

          {checkout.isError && (
            <p className="mt-3 text-sm text-red-400">
              {(checkout.error as Error).message}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
