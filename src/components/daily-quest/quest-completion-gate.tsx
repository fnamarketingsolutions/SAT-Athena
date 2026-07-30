"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuestContext } from "./quest-context";

const RESULTS_PATH = "/quest/results";
const START_PATH = "/quest";

/** A finished quest is a closed session. Every problem and tutor route under
 *  `/quest` sends the learner to the results screen, and the results screen is
 *  only reachable once the quest is actually finished. Children stay unmounted
 *  while a redirect is pending so the quiz UI never flashes. */
export function QuestCompletionGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { phase } = useQuestContext();

  const isCompleted = phase === "completed";
  const isResultsRoute = pathname === RESULTS_PATH;
  const isRedirecting = isCompleted !== isResultsRoute;

  useEffect(() => {
    if (!isRedirecting) return;
    router.replace(isCompleted ? RESULTS_PATH : START_PATH);
  }, [isRedirecting, isCompleted, router]);

  if (isRedirecting) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
