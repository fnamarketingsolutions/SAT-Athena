import { supabase } from "@/lib/supabase/client";
import {
  isRwSubject,
  scalePracticeMathScore,
  scalePracticeRwScore,
} from "@/lib/full-sat/scoring";

type ActivityAnswer = {
  session_id: string;
  problem_id: string;
  is_correct: boolean;
  subtopic_id: string | null;
};

export async function getProgressData(userId: string) {
  const [userSessionsRes, dailyQuestsRes] = await Promise.all([
    supabase
      .from("quiz_sessions")
      .select("id, subtopic_id, score, total_questions, time_elapsed_seconds, created_at")
      .eq("user_id", userId)
      .eq("source", "sat")
      .order("created_at", { ascending: true }),
    supabase
      .from("daily_quests")
      .select("id, score, total_questions, time_elapsed_seconds, created_at, quest_date")
      .eq("user_id", userId)
      .eq("status", "completed")
      .order("created_at", { ascending: true }),
  ]);

  const sessions = userSessionsRes.data ?? [];
  const dailyQuests = dailyQuestsRes.data ?? [];
  const sessionIds = sessions.map((s) => s.id);
  const questIds = dailyQuests.map((q) => q.id);

  const { data: questProblemsRaw } =
    questIds.length > 0
      ? await supabase
          .from("daily_quest_problems")
          .select("quest_id, problem_id, subtopic_id, is_correct")
          .in("quest_id", questIds)
          .not("is_correct", "is", null)
      : { data: [] as { quest_id: string; problem_id: string; subtopic_id: string; is_correct: boolean }[] };

  const questProblems = questProblemsRaw ?? [];

  const subtopicIds = [
    ...new Set([
      ...sessions.map((s) => s.subtopic_id).filter(Boolean) as string[],
      ...questProblems.map((p) => p.subtopic_id),
    ]),
  ];

  const [answersRes, subtopicsRes, topicsRes] = await Promise.all([
    sessionIds.length > 0
      ? supabase
          .from("quiz_answers")
          .select("id, session_id, problem_id, is_correct")
          .in("session_id", sessionIds)
      : Promise.resolve({ data: [] }),
    subtopicIds.length > 0
      ? supabase
          .from("subtopics")
          .select("id, topic_id, name")
          .in("id", subtopicIds)
      : Promise.resolve({ data: [] }),
    supabase
      .from("topics")
      .select("id, name, slug, subject, order_index")
      .order("order_index", { ascending: true }),
  ]);

  const quizAnswers = answersRes.data ?? [];
  const subtopics = subtopicsRes.data ?? [];
  const topics = topicsRes.data ?? [];

  const sessionMap: Record<string, { subtopic_id: string | null; score: number; total_questions: number; time_elapsed_seconds: number; created_at: string }> = {};
  for (const s of sessions) {
    sessionMap[s.id] = s;
  }
  for (const q of dailyQuests) {
    sessionMap[q.id] = {
      subtopic_id: null,
      score: q.score,
      total_questions: q.total_questions,
      time_elapsed_seconds: q.time_elapsed_seconds,
      created_at: q.created_at,
    };
  }

  const activityAnswers: ActivityAnswer[] = [
    ...quizAnswers.map((a) => ({
      session_id: a.session_id,
      problem_id: a.problem_id,
      is_correct: a.is_correct,
      subtopic_id: sessionMap[a.session_id]?.subtopic_id ?? null,
    })),
    ...questProblems.map((p) => ({
      session_id: p.quest_id,
      problem_id: p.problem_id,
      is_correct: p.is_correct ?? false,
      subtopic_id: p.subtopic_id,
    })),
  ];

  const problemIds = [...new Set(activityAnswers.map((a) => a.problem_id))];
  let problemDifficultyMap: Record<string, string> = {};
  if (problemIds.length > 0) {
    const { data: problems } = await supabase
      .from("problems")
      .select("id, difficulty")
      .in("id", problemIds);
    for (const p of problems ?? []) {
      problemDifficultyMap[p.id] = p.difficulty;
    }
  }

  // Build lookup maps
  const subtopicMap: Record<string, { topic_id: string; name: string }> = {};
  for (const st of subtopics) {
    subtopicMap[st.id] = { topic_id: st.topic_id, name: st.name };
  }

  const topicMap: Record<string, { name: string; slug: string; subject: string; order_index: number }> = {};
  for (const t of topics) {
    topicMap[t.id] = { name: t.name, slug: t.slug, subject: t.subject, order_index: t.order_index };
  }

  // 1. Score history: cumulative score by date
  const dailyScores: Record<string, number> = {};
  for (const s of sessions) {
    const date = s.created_at.split("T")[0];
    dailyScores[date] = (dailyScores[date] ?? 0) + s.score;
  }
  for (const q of dailyQuests) {
    const date = q.quest_date ?? q.created_at.split("T")[0];
    dailyScores[date] = (dailyScores[date] ?? 0) + q.score;
  }
  let cumulative = 0;
  const cumulativeScoreHistory = Object.entries(dailyScores)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, dailyScore]) => {
      cumulative += dailyScore;
      return { date, score: cumulative };
    });

  // 2. Accuracy by difficulty
  const difficultyStats: Record<string, { total: number; correct: number }> = {};
  for (const ans of activityAnswers) {
    const difficulty = problemDifficultyMap[ans.problem_id];
    if (!difficulty) continue;
    if (!difficultyStats[difficulty]) difficultyStats[difficulty] = { total: 0, correct: 0 };
    difficultyStats[difficulty].total++;
    if (ans.is_correct) difficultyStats[difficulty].correct++;
  }
  const accuracyByDifficulty = Object.entries(difficultyStats).map(([difficulty, stats]) => ({
    difficulty,
    total: stats.total,
    correct: stats.correct,
    accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
  }));

  // 3. Topic performance
  const topicPerfStats: Record<string, { total: number; correct: number }> = {};
  for (const ans of activityAnswers) {
    if (!ans.subtopic_id) continue;
    const subtopic = subtopicMap[ans.subtopic_id];
    if (!subtopic) continue;
    const topicId = subtopic.topic_id;
    if (!topicPerfStats[topicId]) topicPerfStats[topicId] = { total: 0, correct: 0 };
    topicPerfStats[topicId].total++;
    if (ans.is_correct) topicPerfStats[topicId].correct++;
  }

  const topicPerfMap: Record<string, { total: number; correct: number }> = {};
  for (const [topicId, stats] of Object.entries(topicPerfStats)) {
    const topic = topicMap[topicId];
    if (topic) topicPerfMap[topic.slug] = stats;
  }

  const allTopicPerformance = topics.map((t) => {
    const perf = topicPerfMap[t.slug];
    return {
      name: t.name,
      slug: t.slug,
      subject: t.subject,
      total: perf?.total ?? 0,
      correct: perf?.correct ?? 0,
      accuracy:
        perf && perf.total > 0
          ? Math.round((perf.correct / perf.total) * 100)
          : 0,
    };
  });

  // 4. Recent sessions with subtopic name
  const recentSessions = [
    ...sessions.map((s) => ({
      id: s.id,
      subtopicName: (s.subtopic_id ? subtopicMap[s.subtopic_id]?.name : "") ?? "",
      score: s.score,
      totalQuestions: s.total_questions,
      timeElapsedSeconds: s.time_elapsed_seconds,
      date: s.created_at,
    })),
    ...dailyQuests.map((q) => ({
      id: q.id,
      subtopicName: "Daily Quest",
      score: q.score,
      totalQuestions: q.total_questions,
      timeElapsedSeconds: q.time_elapsed_seconds,
      date: q.created_at,
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);

  // 5. Overall stats
  const totalQ = activityAnswers.length;
  const totalCorrect = activityAnswers.filter((a) => a.is_correct).length;
  const totalTime =
    sessions.reduce((sum, s) => sum + s.time_elapsed_seconds, 0) +
    dailyQuests.reduce((sum, q) => sum + q.time_elapsed_seconds, 0);
  const totalScore =
    sessions.reduce((sum, s) => sum + s.score, 0) +
    dailyQuests.reduce((sum, q) => sum + q.score, 0);
  const sessionCount = sessions.length + dailyQuests.length;

  // 6. Section scores
  const sectionStats: Record<string, { total: number; correct: number }> = {};
  for (const ans of activityAnswers) {
    if (!ans.subtopic_id) continue;
    const subtopic = subtopicMap[ans.subtopic_id];
    if (!subtopic) continue;
    const topic = topicMap[subtopic.topic_id];
    if (!topic) continue;
    const subject = topic.subject;
    if (!sectionStats[subject]) sectionStats[subject] = { total: 0, correct: 0 };
    sectionStats[subject].total++;
    if (ans.is_correct) sectionStats[subject].correct++;
  }

  const sections = Object.entries(sectionStats).map(([subject, stats]) => {
    const accuracy = stats.total > 0 ? stats.correct / stats.total : 0;
    const scaledScore = isRwSubject(subject)
      ? scalePracticeRwScore(stats.correct)
      : scalePracticeMathScore(stats.correct);
    return {
      subject,
      total: stats.total,
      correct: stats.correct,
      accuracy: stats.total > 0 ? Math.round(accuracy * 100) : 0,
      scaledScore: Math.min(scaledScore, 800),
    };
  });

  const rwSection = sections.find(
    (s) => s.subject === "reading-writing" || s.subject === "english"
  ) ?? {
    subject: "reading-writing",
    total: 0,
    correct: 0,
    accuracy: 0,
    scaledScore: 0,
  };
  const mathSection = sections.find((s) => s.subject === "math") ?? {
    subject: "math",
    total: 0,
    correct: 0,
    accuracy: 0,
    scaledScore: 0,
  };

  // Topic mastery
  const MASTERY_THRESHOLD = 0.7;
  const MIN_QUESTIONS = 5;

  const topicMasteryList = topics.map((t) => {
    const perf = topicPerfMap[t.slug];
    const total = perf?.total ?? 0;
    const correct = perf?.correct ?? 0;
    const mastered =
      total >= MIN_QUESTIONS && correct / total >= MASTERY_THRESHOLD;
    return {
      name: t.name,
      mastered,
      attempted: total > 0,
    };
  });

  const masteredCount = topicMasteryList.filter((s) => s.mastered).length;

  return {
    scoreHistory: cumulativeScoreHistory,
    accuracyByDifficulty,
    topicPerformance: allTopicPerformance,
    recentSessions,
    overallStats: {
      totalQuestions: totalQ,
      accuracy: totalQ > 0 ? Math.round((totalCorrect / totalQ) * 100) : 0,
      totalTimeSeconds: totalTime,
      sessionCount,
      avgScore: sessionCount > 0 ? Math.round(totalScore / sessionCount) : 0,
    },
    sectionScores: {
      readingWriting: rwSection,
      math: mathSection,
    },
    topicMastery: {
      items: topicMasteryList,
      masteredCount,
      totalCount: topicMasteryList.length,
    },
  };
}
