import { supabase } from "@/lib/supabase/client";
import {
  averageSecondsPerQuestion,
  getPaceStatus,
  type PaceStatus,
} from "@/lib/pacing";

export type PaceSessionSummary = {
  id: string;
  source: "daily_quest" | "mock_exam";
  completedAt: string;
  totalSeconds: number;
  answeredCount: number;
  avgSecondsPerQuestion: number;
};

export type RecentPaceSummary = {
  status: PaceStatus | null;
  avgSecondsPerQuestion: number | null;
  sessionCount: number;
  sessions: PaceSessionSummary[];
};

/**
 * Last up to 3 completed practice sessions (daily quest + mock exam),
 * pooled average seconds per question for dashboard pacing status.
 * Only questions with an actively selected answer count toward the average.
 */
export async function getRecentPaceSummary(
  userId: string
): Promise<RecentPaceSummary> {
  const db = supabase as any;

  const [{ data: quests }, { data: attempts }] = await Promise.all([
    db
      .from("daily_quests")
      .select("id, time_elapsed_seconds, total_questions, updated_at, created_at")
      .eq("user_id", userId)
      .eq("status", "completed")
      .order("updated_at", { ascending: false })
      .limit(5),
    db
      .from("full_sat_attempts")
      .select("id, total_time_seconds, completed_at, created_at")
      .eq("user_id", userId)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(5),
  ]);

  const sessions: PaceSessionSummary[] = [];
  const questList = quests ?? [];
  const questIds = questList.map((q: { id: string }) => q.id);

  const answeredByQuest = new Map<string, number>();
  if (questIds.length > 0) {
    const { data: questAnswers } = await db
      .from("daily_quest_problems")
      .select("quest_id, selected_option, is_correct")
      .in("quest_id", questIds);

    for (const row of questAnswers ?? []) {
      // Count only actively answered questions (choice selected or graded).
      if (row.selected_option == null && row.is_correct == null) continue;
      answeredByQuest.set(
        row.quest_id,
        (answeredByQuest.get(row.quest_id) ?? 0) + 1
      );
    }
  }

  for (const q of questList) {
    const totalSeconds = Number(q.time_elapsed_seconds) || 0;
    const answeredCount = answeredByQuest.get(q.id) ?? 0;
    const avg = averageSecondsPerQuestion(totalSeconds, answeredCount);
    if (avg == null) continue;
    sessions.push({
      id: q.id,
      source: "daily_quest",
      completedAt: q.updated_at ?? q.created_at,
      totalSeconds,
      answeredCount,
      avgSecondsPerQuestion: avg,
    });
  }

  const attemptList = attempts ?? [];
  if (attemptList.length > 0) {
    const attemptIds = attemptList.map((a: { id: string }) => a.id);
    const { data: answers } = await db
      .from("full_sat_answers")
      .select("attempt_id, selected_option")
      .in("attempt_id", attemptIds);

    const answeredByAttempt = new Map<string, number>();
    for (const row of answers ?? []) {
      if (row.selected_option == null) continue;
      answeredByAttempt.set(
        row.attempt_id,
        (answeredByAttempt.get(row.attempt_id) ?? 0) + 1
      );
    }

    for (const a of attemptList) {
      const totalSeconds = Number(a.total_time_seconds) || 0;
      const answeredCount = answeredByAttempt.get(a.id) ?? 0;
      const avg = averageSecondsPerQuestion(totalSeconds, answeredCount);
      if (avg == null) continue;
      sessions.push({
        id: a.id,
        source: "mock_exam",
        completedAt: a.completed_at ?? a.created_at,
        totalSeconds,
        answeredCount,
        avgSecondsPerQuestion: avg,
      });
    }
  }

  sessions.sort(
    (x, y) =>
      new Date(y.completedAt).getTime() - new Date(x.completedAt).getTime()
  );

  const recent = sessions.slice(0, 3);
  if (recent.length === 0) {
    return {
      status: null,
      avgSecondsPerQuestion: null,
      sessionCount: 0,
      sessions: [],
    };
  }

  const totalSeconds = recent.reduce((s, r) => s + r.totalSeconds, 0);
  const totalAnswered = recent.reduce((s, r) => s + r.answeredCount, 0);
  const avgSecondsPerQuestion = averageSecondsPerQuestion(
    totalSeconds,
    totalAnswered
  );

  return {
    status:
      avgSecondsPerQuestion != null
        ? getPaceStatus(avgSecondsPerQuestion)
        : null,
    avgSecondsPerQuestion,
    sessionCount: recent.length,
    sessions: recent,
  };
}
