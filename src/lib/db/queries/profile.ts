import { getProgressData } from "@/lib/db/queries/progress";
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

function baselineSectionScores(user: {
  start_composite: number | null;
  current_reading_writing: number | null;
  current_math: number | null;
}) {
  if (user.start_composite != null) {
    const rw = Math.round(user.start_composite / 2);
    const math = user.start_composite - rw;
    return { rw, math };
  }
  const rw = user.current_reading_writing ?? 400;
  const math = user.current_math ?? 400;
  return { rw, math };
}

export async function getProfileData(userId: string) {
  const today = new Date().toISOString().split("T")[0];

  const [userRes, progress, dailyQuestsRes, streakHistoryRes, lessonSessionsRes] =
    await Promise.all([
      supabase
        .from("users")
        .select(
          "display_name, avatar_url, created_at, target_score, best_streak, start_composite, current_reading_writing, current_math"
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

  const baseline = userRecord
    ? baselineSectionScores(userRecord)
    : { rw: 400, math: 400 };
  const rwSection = progress.sectionScores.readingWriting;
  const mathSection = progress.sectionScores.math;

  const rwScore = rwSection.total > 0 ? rwSection.scaledScore : baseline.rw;
  const mathScore = mathSection.total > 0 ? mathSection.scaledScore : baseline.math;
  const totalScore = rwScore + mathScore;

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
    totalScore,
    questsDone: dailyQuests.length,
    totalTimeSeconds: progress.overallStats.totalTimeSeconds + lessonTimeSeconds,
    accuracy: progress.overallStats.accuracy,
    streak,
    bestStreak,
  };
}
