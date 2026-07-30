import { getProgressData } from "@/lib/db/queries/progress";
import { MBE_PASS_PERCENT } from "@/lib/exam-config";
import { EXAM_SESSION_SOURCES } from "@/lib/exam-config";
import { PROFILE_HEATMAP_WEEKS } from "@/lib/profile-heatmap";
import { supabase } from "@/lib/supabase/client";

export type ActivityHeatmapDay = {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
};

function intensityLevel(count: number): ActivityHeatmapDay["level"] {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count <= 4) return 3;
  return 4;
}

/** Daily study intensity for the last `weeks` weeks (GitHub-style heatmap). */
async function getActivityHeatmap(
  userId: string,
  weeks = PROFILE_HEATMAP_WEEKS
): Promise<ActivityHeatmapDay[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(today.getDate() - weeks * 7);
  const startIso = start.toISOString();
  const startDate = start.toISOString().split("T")[0];

  const [sessionsRes, questsRes, lessonsRes] = await Promise.all([
    supabase
      .from("quiz_sessions")
      .select("created_at")
      .eq("user_id", userId)
      .in("source", [...EXAM_SESSION_SOURCES])
      .gte("created_at", startIso),
    supabase
      .from("daily_quests")
      .select("quest_date")
      .eq("user_id", userId)
      .eq("status", "completed")
      .gte("quest_date", startDate),
    (supabase as any)
      .from("micro_lesson_sessions")
      .select("created_at")
      .eq("user_id", userId)
      .gte("created_at", startIso) as Promise<{
      data: { created_at: string }[] | null;
    }>,
  ]);

  const counts: Record<string, number> = {};
  const bump = (date: string) => {
    counts[date] = (counts[date] ?? 0) + 1;
  };

  for (const s of sessionsRes.data ?? []) {
    bump(s.created_at.slice(0, 10));
  }
  for (const q of questsRes.data ?? []) {
    bump(q.quest_date);
  }
  for (const l of lessonsRes.data ?? []) {
    bump(l.created_at.slice(0, 10));
  }

  return Object.entries(counts)
    .map(([date, count]) => ({
      date,
      count,
      level: intensityLevel(count),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function getProfileData(userId: string) {
  const [userRes, progress, dailyQuestsRes, lessonSessionsRes, activityHeatmap] =
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
      (supabase as any)
        .from("micro_lesson_sessions")
        .select("duration_seconds")
        .eq("user_id", userId) as Promise<{
        data: { duration_seconds: number }[] | null;
      }>,
      getActivityHeatmap(userId, PROFILE_HEATMAP_WEEKS),
    ]);

  const userRecord = userRes.data;
  const dailyQuests = dailyQuestsRes.data ?? [];
  const lessonTimeSeconds = (lessonSessionsRes.data ?? []).reduce(
    (sum, s) => sum + (s.duration_seconds ?? 0),
    0
  );

  const overallAccuracy = progress.overallStats.accuracy;
  const targetPercent = MBE_PASS_PERCENT;

  // All MBE subjects for topic progress (include not-started)
  const subjectScores = progress.subjectScores;

  return {
    user: userRecord
      ? {
          displayName: userRecord.display_name,
          avatarUrl: userRecord.avatar_url,
          createdAt: new Date(userRecord.created_at),
          targetScore: userRecord.target_score,
        }
      : null,
    overallAccuracy,
    targetPercent,
    sessionsCompleted: dailyQuests.length + progress.overallStats.sessionCount,
    totalTimeSeconds:
      progress.overallStats.totalTimeSeconds + lessonTimeSeconds,
    accuracy: overallAccuracy,
    subjectScores,
    activityHeatmap,
  };
}
