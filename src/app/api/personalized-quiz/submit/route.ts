import { getAuthIdentity, getAppUser } from "@/lib/auth/current-user";
import { insertQuizQuestionEvents } from "@/lib/db/queries/tracking";
import { supabase } from "@/lib/supabase/client";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { userId: clerkId } = await getAuthIdentity();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getAppUser(clerkId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const body = await req.json();
  const { score, totalQuestions, timeElapsedSeconds, answers, events } = body as {
    score: number;
    totalQuestions: number;
    timeElapsedSeconds: number;
    answers: {
      problemId: string;
      selectedOption: number;
      isCorrect: boolean;
      responseTimeMs?: number;
      wrongCount?: number;
      hintUsed?: boolean;
      tutorUsed?: boolean;
      practiceCompleted?: boolean;
    }[];
    events?: {
      problemId: string;
      eventType: string;
      responseTimeMs?: number;
      selectedOption?: number;
      wrongCount?: number;
      practiceProblemId?: string;
      timestamp: string;
    }[];
  };

  if (
    score == null ||
    !totalQuestions ||
    timeElapsedSeconds == null ||
    !Array.isArray(answers)
  ) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { data: session, error: sessionError } = await supabase
    .from("quiz_sessions")
    .insert({
      user_id: user.id,
      source: "custom",
      subtopic_id: null,
      score,
      total_questions: totalQuestions,
      time_elapsed_seconds: timeElapsedSeconds,
    })
    .select("id")
    .single();

  if (sessionError || !session) {
    return NextResponse.json(
      { error: sessionError?.message ?? "Failed to save session" },
      { status: 500 }
    );
  }

  if (answers.length > 0) {
    const { error: answersError } = await supabase.from("quiz_answers").insert(
      answers.map((a) => ({
        session_id: session.id,
        problem_id: a.problemId,
        selected_option: a.selectedOption,
        is_correct: a.isCorrect,
        ...(a.responseTimeMs !== undefined && { response_time_ms: a.responseTimeMs }),
        ...(a.wrongCount !== undefined && { wrong_count: a.wrongCount }),
        ...(a.hintUsed !== undefined && { hint_used: a.hintUsed }),
        ...(a.tutorUsed !== undefined && { tutor_used: a.tutorUsed }),
        ...(a.practiceCompleted !== undefined && {
          practice_completed: a.practiceCompleted,
        }),
      }))
    );
    if (answersError) {
      console.error("[personalized-quiz/submit] answers:", answersError.message);
    }
  }

  if (events && events.length > 0) {
    try {
      await insertQuizQuestionEvents(
        events.map((e) => ({
          sessionId: session.id,
          problemId: e.problemId,
          userId: user.id,
          eventType: e.eventType,
          responseTimeMs: e.responseTimeMs,
          selectedOption: e.selectedOption,
          wrongCount: e.wrongCount,
          practiceProblemId: e.practiceProblemId,
          timestamp: e.timestamp,
        }))
      );
    } catch (err) {
      console.error("[personalized-quiz/submit] events:", err);
    }
  }

  return NextResponse.json({ sessionId: session.id });
}
