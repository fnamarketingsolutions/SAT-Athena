import { getAuthIdentity, getAppUser } from "@/lib/auth/current-user";
import { hasLearningAccess } from "@/lib/db/queries/users";
import { redirect } from "next/navigation";
import { MarketingLanding } from "@/components/marketing/marketing-landing";

export default async function LandingPage() {
  const { userId } = await getAuthIdentity();
  if (userId) {
    const user = await getAppUser(userId);
    if (user && hasLearningAccess(user)) {
      redirect(user.onboardingCompleted ? "/dashboard" : "/onboarding");
    }
    redirect("/checkout?interval=monthly");
  }
  return <MarketingLanding />;
}
