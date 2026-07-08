import { supabase } from "@/lib/supabase/client";

export async function saveSatQuizSession(data: {
  userId: string;
  subtopicId: string;
  score: number;
  totalQuestions: number;
  timeElapsedSeconds: number;
  answers: {
    problemId: string;
    selectedOption: number;
    isCorrect: boolean;
    difficultyLevel?: number;
    responseTimeMs?: number;
    wrongCount?: number;
    hintUsed?: boolean;
    tutorUsed?: boolean;
    practiceCompleted?: boolean;
  }[];
}) {
  // Insert session first
  const { data: session, error: sessionError } = await supabase
    .from("quiz_sessions")
    .insert({
      user_id: data.userId,
      source: "sat",
      subtopic_id: data.subtopicId,
      score: data.score,
      total_questions: data.totalQuestions,
      time_elapsed_seconds: data.timeElapsedSeconds,
    })
    .select()
    .single();

  if (sessionError || !session) throw new Error(sessionError?.message ?? "Failed to save session");

  if (data.answers.length > 0) {
    const { error: answersError } = await supabase
      .from("quiz_answers")
      .insert(
        data.answers.map((a) => ({
          session_id: session.id,
          problem_id: a.problemId,
          selected_option: a.selectedOption,
          is_correct: a.isCorrect,
          ...(a.difficultyLevel !== undefined && { difficulty_level: a.difficultyLevel }),
          ...(a.responseTimeMs !== undefined && { response_time_ms: a.responseTimeMs }),
          ...(a.wrongCount !== undefined && { wrong_count: a.wrongCount }),
          ...(a.hintUsed !== undefined && { hint_used: a.hintUsed }),
          ...(a.tutorUsed !== undefined && { tutor_used: a.tutorUsed }),
          ...(a.practiceCompleted !== undefined && { practice_completed: a.practiceCompleted }),
        }))
      );
    if (answersError) throw new Error(answersError.message);
  }

  return {
    id: session.id,
    userId: session.user_id,
    subtopicId: session.subtopic_id,
    score: session.score,
    totalQuestions: session.total_questions,
    timeElapsedSeconds: session.time_elapsed_seconds,
    createdAt: new Date(session.created_at),
  };
}
