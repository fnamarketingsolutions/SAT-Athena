import "server-only";

import { getEngagementSummary, getStuckPoints } from "@/lib/db/queries/analytics";
import { getUserAttempts } from "@/lib/db/queries/full-sat";
import { getProgressData } from "@/lib/db/queries/progress";
import { MBE_PASS_PERCENT } from "@/lib/exam-config";
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

function baselineAccuracy(user: AnalyticsUser): number {
  if (user.startComposite != null) {
    return Math.min(100, Math.round(user.startComposite / 16));
  }
  if (user.currentComposite != null) {
    return Math.min(100, Math.round(user.currentComposite / 16));
  }
  return 0;
}

export async function getAnalyticsDashboard(
  userId: string,
  user: AnalyticsUser
) {
  const today = new Date().toISOString().split("T")[0];
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 6);
  const weekAgoStr = weekAgo.toISOString().split("T")[0];

  const [progress, stuckPoints, engagement, mockAttempts, weekQuestsRes, streakHistoryRes] =
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

  const overallAccuracy = progress.overallStats.accuracy;
  const startAccuracy = baselineAccuracy(user);
  const targetPercent = MBE_PASS_PERCENT;

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

  const completedMocks = mockAttempts
    .filter((a) => a.status === "completed")
    .slice(0, 5);

  const attemptIds = completedMocks.map((a) => a.id);
  const answerCountByAttempt: Record<string, number> = {};
  if (attemptIds.length > 0) {
    const { data: answerRows } = await supabase
      .from("full_sat_answers")
      .select("attempt_id")
      .in("attempt_id", attemptIds);
    for (const row of answerRows ?? []) {
      answerCountByAttempt[row.attempt_id] =
        (answerCountByAttempt[row.attempt_id] ?? 0) + 1;
    }
  }

  const mbeMockAttempts = completedMocks.map((a) => {
    const correct = (a.rwRawScore ?? 0) + (a.mathRawScore ?? 0);
    const total = answerCountByAttempt[a.id] ?? 0;
    const percentScore =
      total > 0 ? Math.round((correct / total) * 100) : null;
    return {
      id: a.id,
      correct,
      total,
      percentScore,
      passed: percentScore != null && percentScore >= targetPercent,
      completedAt: a.completedAt,
    };
  });

  const forecastWeeks =
    overallAccuracy < targetPercent &&
    startAccuracy < overallAccuracy &&
    overallAccuracy > 0
      ? Math.max(
          1,
          Math.ceil(
            (targetPercent - overallAccuracy) /
              Math.max(1, (overallAccuracy - startAccuracy) / 4)
          )
        )
      : null;

  return {
    user: {
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      targetScore: user.targetScore,
      skillScore: user.skillScore,
      startAccuracy,
    },
    overallAccuracy,
    targetPercent,
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
    mbeMockAttempts,
  };
}
