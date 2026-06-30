import { getAuthIdentity, getAppUser } from "@/lib/auth/current-user";
import { hasLearningAccess, learningGateReason } from "@/lib/db/queries/users";
import { LearningUpsell } from "@/components/educators/learning-upsell";
import { OnboardingGate } from "@/components/onboarding/onboarding-gate";
import { QuestLockGate } from "@/components/accountability/quest-lock-gate";
import { AppShell } from "@/components/layout/app-shell";
import { redirect } from "next/navigation";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await getAuthIdentity();
  if (!userId) {
    redirect("/sign-in?redirect_url=%2Fdashboard");
  }

  const user = await getAppUser(userId);
  if (user && !hasLearningAccess(user)) {
    return (
      <AppShell>
        <LearningUpsell reason={learningGateReason(user)} />
      </AppShell>
    );
  }

  const needsOnboarding = Boolean(
    user && hasLearningAccess(user) && !user.onboardingCompleted
  );

  if (needsOnboarding) {
    return (
      <AppShell>
        <OnboardingGate>{children}</OnboardingGate>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <QuestLockGate>
        <main>{children}</main>
      </QuestLockGate>
    </AppShell>
  );
}
