import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getAuthIdentity, getAppUser } from "@/lib/auth/current-user";
import { hasLearningAccess } from "@/lib/db/queries/users";
import { reconcileCheckoutSession } from "@/lib/stripe/reconcile-checkout";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { VerifyCheckoutReturn } from "@/components/onboarding/verify-checkout-return";

type Props = {
  searchParams: Promise<{ session_id?: string; welcome?: string }>;
};

export default async function OnboardingPage({ searchParams }: Props) {
  const params = await searchParams;
  const { userId } = await getAuthIdentity();
  if (!userId) {
    redirect("/sign-in?redirect_url=%2Fonboarding");
  }

  let user = await getAppUser(userId);
  if (!user) {
    redirect("/sign-in?redirect_url=%2Fonboarding");
  }

  if (params.session_id) {
    await reconcileCheckoutSession(params.session_id, user.id).catch((err) => {
      console.error("[onboarding] checkout reconcile failed", err);
    });
    user = (await getAppUser(userId)) ?? user;
  }

  if (!hasLearningAccess(user)) {
    redirect("/checkout?interval=monthly");
  }

  if (user.onboardingCompleted) {
    redirect("/dashboard");
  }

  return (
    <>
      <Suspense fallback={null}>
        <VerifyCheckoutReturn />
      </Suspense>
      <Suspense
        fallback={
          <div className="play-stage flex min-h-screen items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/20 border-t-[var(--p-accent)]" />
          </div>
        }
      >
        <OnboardingWizard />
      </Suspense>
    </>
  );
}
