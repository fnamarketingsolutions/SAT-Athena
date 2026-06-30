import "server-only";

import { getTodaysQuest } from "@/lib/db/queries/daily-quest";
import { supabase } from "@/lib/supabase/client";

/** When on, learners must finish today's daily quest before other app surfaces. */
export function questAccountabilityEnabled() {
  return /^(1|true|on)$/i.test(process.env.QUEST_ACCOUNTABILITY ?? "");
}

export type QuestAccountabilityStatus = {
  enabled: boolean;
  locked: boolean;
  quest: {
    id: string;
    status: string;
    totalQuestions: number;
    correctCount: number;
    xpEarned: number;
    answeredCount: number;
  } | null;
  streak: number;
};

function computeQuestStreak(
  questHistory: { quest_date: string }[],
  today: string
): number {
  if (questHistory.length === 0) return 0;

  const todayDate = new Date(today);
  const mostRecent = new Date(questHistory[0].quest_date);
  const daysSinceLast = Math.floor(
    (todayDate.getTime() - mostRecent.getTime()) / 86_400_000
  );

  if (daysSinceLast > 1) return 0;

  let streak = 1;
  for (let i = 1; i < questHistory.length; i++) {
    const curr = new Date(questHistory[i].quest_date);
    const prev = new Date(questHistory[i - 1].quest_date);
    const diffDays = Math.round(
      (prev.getTime() - curr.getTime()) / 86_400_000
    );
    if (diffDays === 1) streak++;
    else break;
  }
  return streak;
}

export async function getQuestAccountabilityStatus(
  userId: string,
  options?: { onboardingCompleted?: boolean }
): Promise<QuestAccountabilityStatus> {
  const enabled =
    questAccountabilityEnabled() && options?.onboardingCompleted !== false;

  if (!enabled) {
    return { enabled: false, locked: false, quest: null, streak: 0 };
  }

  const today = new Date().toISOString().split("T")[0];
  const result = await getTodaysQuest(userId);

  const { data: questHistory } = await supabase
    .from("daily_quests")
    .select("quest_date")
    .eq("user_id", userId)
    .eq("status", "completed")
    .order("quest_date", { ascending: false })
    .limit(60);

  const streak = computeQuestStreak(questHistory ?? [], today);

  if (!result) {
    return { enabled: true, locked: true, quest: null, streak };
  }

  const answeredCount = result.problems.filter(
    (p) => p.isCorrect !== null
  ).length;

  const locked = result.quest.status !== "completed";

  return {
    enabled: true,
    locked,
    quest: {
      id: result.quest.id,
      status: result.quest.status,
      totalQuestions: result.quest.totalQuestions,
      correctCount: result.quest.correctCount,
      xpEarned: result.quest.xpEarned,
      answeredCount,
    },
    streak,
  };
}
