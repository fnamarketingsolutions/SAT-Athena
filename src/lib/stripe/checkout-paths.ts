import type { BillingInterval } from "./plans";

/** Hosted Stripe checkout entry (auth required, not paywalled). */
export function checkoutPath(interval: BillingInterval = "monthly"): string {
  return `/checkout?interval=${interval}`;
}

/** Payment-first sign-up: account creation then Stripe checkout. */
export function signUpForCheckoutPath(interval: BillingInterval = "monthly"): string {
  return `/sign-up?redirect_url=${encodeURIComponent(checkoutPath(interval))}`;
}

export function signInForCheckoutPath(interval: BillingInterval = "monthly"): string {
  return `/sign-in?redirect_url=${encodeURIComponent(checkoutPath(interval))}`;
}

export function parseBillingInterval(value: string | null | undefined): BillingInterval {
  return value === "yearly" ? "yearly" : "monthly";
}
