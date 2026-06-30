import { redirect } from "next/navigation";
import { getAuthIdentity } from "@/lib/auth/current-user";
import {
  checkoutPath,
  parseBillingInterval,
} from "@/lib/stripe/checkout-paths";
import { CheckoutClient } from "./checkout-client";

type Props = {
  searchParams: Promise<{ interval?: string }>;
};

/** Auth-required Stripe handoff. Lives outside (protected) so paywall
 *  does not block checkout for new accounts. */
export default async function CheckoutPage({ searchParams }: Props) {
  const params = await searchParams;
  const interval = parseBillingInterval(params.interval);

  const { userId } = await getAuthIdentity();
  if (!userId) {
    redirect(
      `/sign-in?redirect_url=${encodeURIComponent(checkoutPath(interval))}`
    );
  }

  return <CheckoutClient interval={interval} />;
}
