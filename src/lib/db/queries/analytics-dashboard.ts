import "server-only";

import { getEngagementSummary, getStuckPoints } from "@/lib/db/queries/analytics";
import { getUserAttempts } from "@/lib/db/queries/full-sat";
import { getProgressData } from "@/lib/db/queries/progress";
import { supabase } from "@/lib/supabase/client";

type AnalyticsUser = {
  displayName: string | null;
  avatarUrl: string | null;
  targetScore: number | null;
  skillScore: number | null;
  startComposite: number | null;
  currentComposite: number | null;
  currentReadingWriting: number | null;
  currentMath: number | null;
  bestStreak: number;
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

function baselineSectionScores(user: AnalyticsUser) {
  if (user.startComposite != null) {
    const rw = Math.round(user.startComposite / 2);
    const math = user.startComposite - rw;
    return { rw, math };
  }
  const rw = user.currentReadingWriting ?? 400;
  const math = user.currentMath ?? 400;
  return { rw, math };
}

export async function getAnalyticsDashboard(
  userId: string,
  user: AnalyticsUser
) {
  const today = new Date().toISOString().split("T")[0];
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 6);
  const weekAgoStr = weekAgo.toISOString().split("T")[0];

  const [progress, stuckPoints, engagement, fullSatAttempts, weekQuestsRes, streakHistoryRes] =
    await Promise.all([
      getProgressData(userId),
      getStuckPoints(userId),
      getEngagementSummary(userId),
      getUserAttempts(userId),
      supabase
        .from("daily_quests")
        .select("quest_date, status")
        .eq("user_id", userId)
        .gte("quest_date", weekAgoStr)
        .lte("quest_date", today),
      supabase
        .from("daily_quests")
        .select("quest_date")
        .eq("user_id", userId)
        .eq("status", "completed")
        .order("quest_date", { ascending: false })
        .limit(60),
    ]);

  const baseline = baselineSectionScores(user);
  const rwSection = progress.sectionScores.readingWriting;
  const mathSection = progress.sectionScores.math;

  const rwScore =
    rwSection.total > 0 ? rwSection.scaledScore : baseline.rw;
  const mathScore =
    mathSection.total > 0 ? mathSection.scaledScore : baseline.math;
  const compositeScore = rwScore + mathScore;

  const questStreak = computeQuestStreak(streakHistoryRes.data ?? [], today);

  const weekQuestDays = Array.from({ length: 7 }).map((_, idx) => {
    const d = new Date(weekAgo);
    d.setDate(weekAgo.getDate() + idx);
    const dateStr = d.toISOString().split("T")[0];
    const dayLabel = d.toLocaleDateString("en-US", { weekday: "short" });
    const record = (weekQuestsRes.data ?? []).find((q) => q.quest_date === dateStr);
    return {
      date: dateStr,
      day: dayLabel,
      completed: record?.status === "completed",
      isToday: dateStr === today,
    };
  });

  const completedFullSats = fullSatAttempts
    .filter((a) => a.status === "completed" && a.totalScore != null)
    .slice(0, 5)
    .map((a) => ({
      id: a.id,
      totalScore: a.totalScore!,
      rwScaledScore: a.rwScaledScore,
      mathScaledScore: a.mathScaledScore,
      completedAt: a.completedAt,
    }));

  const forecastWeeks =
    user.targetScore &&
    user.startComposite &&
    compositeScore < user.targetScore &&
    compositeScore > user.startComposite
      ? Math.max(
          1,
          Math.ceil(
            (user.targetScore - compositeScore) /
              Math.max(1, (compositeScore - user.startComposite) / 4)
          )
        )
      : null;

  return {
    user: {
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      targetScore: user.targetScore,
      skillScore: user.skillScore,
      startComposite: user.startComposite,
    },
    compositeScore,
    rwScore,
    mathScore,
    targetScore: user.targetScore ?? 1400,
    forecastWeeks,
    ...progress,
    stuckPoints: stuckPoints.slice(0, 6),
    engagement,
    consistency: {
      questStreak,
      bestStreak: Math.max(user.bestStreak, questStreak),
      weekQuestDays,
      questsCompletedThisWeek: weekQuestDays.filter((d) => d.completed).length,
    },
    fullSatAttempts: completedFullSats,
  };
}
