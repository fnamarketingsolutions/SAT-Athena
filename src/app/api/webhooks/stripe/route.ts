import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/client";
import { applySubscriptionState } from "@/lib/db/queries/users";

export const runtime = "nodejs";

/**
 * Stripe webhook — the single writer that reconciles local billing state from
 * Stripe. Public (no auth): authenticity comes from the signature check against
 * STRIPE_WEBHOOK_SECRET. Always returns 200 on a verified event so Stripe stops
 * retrying; handler work is idempotent (applySubscriptionState sets absolute
 * values, not deltas).
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[webhooks/stripe] STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const stripe = getStripe();
  const payload = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    console.error("[webhooks/stripe] signature verification failed:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await applySubscriptionState(customerIdOf(sub.customer), {
          subscriptionId: sub.id,
          status: sub.status,
        });
        break;
      }
      case "checkout.session.completed": {
        // Belt-and-suspenders alongside the subscription.* events: resolve the
        // real subscription status so access is granted the moment Stripe
        // confirms the first payment.
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription" && session.subscription) {
          const sub = await stripe.subscriptions.retrieve(
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription.id
          );
          await applySubscriptionState(customerIdOf(sub.customer), {
            subscriptionId: sub.id,
            status: sub.status,
          });
        }
        break;
      }
      default:
        // Unhandled event types are acknowledged so Stripe stops retrying.
        break;
    }
  } catch (err) {
    console.error(`[webhooks/stripe] handler error for ${event.type}:`, err);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

/** A Stripe `customer` field is an id string or an expanded object. */
function customerIdOf(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer
): string {
  return typeof customer === "string" ? customer : customer.id;
}
