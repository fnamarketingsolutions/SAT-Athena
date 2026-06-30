import "server-only";

import { getStripe } from "@/lib/stripe/client";
import { applySubscriptionState } from "@/lib/db/queries/users";

/**
 * Grant learning_access immediately after Checkout when webhooks are not wired
 * (local dev). Safe to call multiple times — applySubscriptionState is idempotent.
 */
export async function reconcileCheckoutSession(
  sessionId: string,
  userId: string
): Promise<void> {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.client_reference_id && session.client_reference_id !== userId) {
    throw new Error("Checkout session does not belong to this user");
  }

  if (session.mode !== "subscription" || !session.subscription) {
    throw new Error("Not a subscription checkout session");
  }

  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id;

  if (!customerId) {
    throw new Error("Checkout session has no customer");
  }

  const sub = await stripe.subscriptions.retrieve(
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription.id
  );

  await applySubscriptionState(customerId, {
    subscriptionId: sub.id,
    status: sub.status,
  });
}
