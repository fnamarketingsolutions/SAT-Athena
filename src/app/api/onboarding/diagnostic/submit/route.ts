import { getAuthIdentity, getAppUser } from "@/lib/auth/current-user";
import {
  getOnboardingProblemsWithAnswers,
  updateOnboardingProgress,
} from "@/lib/db/queries/onboarding";
import { updateUser } from "@/lib/db/queries/users";
import { scaleMathScore, scaleRwScore } from "@/lib/full-sat/scoring";
import { supabase } from "@/lib/supabase/client";
import { NextResponse } from "next/server";

function isMathCategory(category: string) {
  return /math/i.test(category);
}

export async function POST(req: Request) {
  const { userId: externalId } = await getAuthIdentity();
  if (!externalId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getAppUser(externalId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const body = (await req.json()) as {
    answers: { problemId: string; selectedOption: number }[];
    timeElapsedSeconds?: number;
  };

  if (!Array.isArray(body.answers) || body.answers.length === 0) {
    return NextResponse.json({ error: "answers required" }, { status: 400 });
  }

  const problems = await getOnboardingProblemsWithAnswers();
  const byId = new Map(problems.map((p) => [p.id, p]));

  let rwCorrect = 0;
  let rwTotal = 0;
  let mathCorrect = 0;
  let mathTotal = 0;

  const answerRows: {
    problem_id: string;
    selected_option: number;
    is_correct: boolean;
  }[] = [];

  for (const answer of body.answers) {
    const problem = byId.get(answer.problemId);
    if (!problem) continue;

    const isCorrect = answer.selectedOption === problem.correct_option;
    answerRows.push({
      problem_id: answer.problemId,
      selected_option: answer.selectedOption,
      is_correct: isCorrect,
    });

    if (isMathCategory(problem.category ?? "")) {
      mathTotal += 1;
      if (isCorrect) mathCorrect += 1;
    } else {
      rwTotal += 1;
      if (isCorrect) rwCorrect += 1;
    }
  }

  const rwScaled = rwTotal > 0 ? scaleRwScore(rwCorrect, rwTotal) : 400;
  const mathScaled = mathTotal > 0 ? scaleMathScore(mathCorrect, mathTotal) : 400;
  const composite = rwScaled + mathScaled;

  const { data: session, error: sessionError } = await supabase
    .from("quiz_sessions")
    .insert({
      user_id: user.id,
      source: "onboarding",
      score: rwCorrect + mathCorrect,
      total_questions: body.answers.length,
      time_elapsed_seconds: body.timeElapsedSeconds ?? 0,
    })
    .select("id")
    .single();

  if (sessionError) throw sessionError;

  if (answerRows.length > 0) {
    const { error: answersError } = await supabase.from("quiz_answers").insert(
      answerRows.map((row) => ({
        session_id: session.id,
        problem_id: row.problem_id,
        selected_option: row.selected_option,
        is_correct: row.is_correct,
      }))
    );
    if (answersError) throw answersError;
  }

  await updateUser(externalId, {
    startComposite: composite,
    currentComposite: composite,
    currentReadingWriting: rwScaled,
    currentMath: mathScaled,
  });

  await updateOnboardingProgress(user.id, { currentStep: "goals" });

  return NextResponse.json({
    rwScaled,
    mathScaled,
    composite,
    rwCorrect,
    mathCorrect,
    totalQuestions: body.answers.length,
  });
}
