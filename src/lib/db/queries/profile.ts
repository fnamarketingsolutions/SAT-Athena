import { getProgressData } from "@/lib/db/queries/progress";
import { MBE_PASS_PERCENT } from "@/lib/exam-config";
import { supabase } from "@/lib/supabase/client";

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

export async function getProfileData(userId: string) {
  const today = new Date().toISOString().split("T")[0];

  const [userRes, progress, dailyQuestsRes, streakHistoryRes, lessonSessionsRes] =
    await Promise.all([
      supabase
        .from("users")
        .select(
          "display_name, avatar_url, created_at, target_score, best_streak"
        )
        .eq("id", userId)
        .limit(1)
        .maybeSingle(),
      getProgressData(userId),
      supabase
        .from("daily_quests")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "completed"),
      supabase
        .from("daily_quests")
        .select("quest_date")
        .eq("user_id", userId)
        .eq("status", "completed")
        .order("quest_date", { ascending: false })
        .limit(60),
      (supabase as any)
        .from("micro_lesson_sessions")
        .select("duration_seconds")
        .eq("user_id", userId) as Promise<{
        data: { duration_seconds: number }[] | null;
      }>,
    ]);

  const userRecord = userRes.data;
  const dailyQuests = dailyQuestsRes.data ?? [];
  const lessonTimeSeconds = (lessonSessionsRes.data ?? []).reduce(
    (sum, s) => sum + (s.duration_seconds ?? 0),
    0
  );

  const streak = computeQuestStreak(streakHistoryRes.data ?? [], today);
  const storedBestStreak = userRecord?.best_streak ?? 0;
  const bestStreak = Math.max(storedBestStreak, streak);

  const overallAccuracy = progress.overallStats.accuracy;
  const targetPercent = MBE_PASS_PERCENT;

  return {
    user: userRecord
      ? {
          displayName: userRecord.display_name,
          avatarUrl: userRecord.avatar_url,
          createdAt: new Date(userRecord.created_at),
          targetScore: userRecord.target_score,
          bestStreak: storedBestStreak,
        }
      : null,
    overallAccuracy,
    targetPercent,
    questsDone: dailyQuests.length,
    totalTimeSeconds: progress.overallStats.totalTimeSeconds + lessonTimeSeconds,
    accuracy: overallAccuracy,
    streak,
    bestStreak,
    subjectScores: progress.subjectScores,
  };
}
