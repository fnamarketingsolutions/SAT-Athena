import { getAuthIdentity, getAppUser } from "@/lib/auth/current-user";
import {
  getProblemAnswers,
  updateOnboardingProgress,
} from "@/lib/db/queries/onboarding";
import { updateUser } from "@/lib/db/queries/users";
import { accuracyToComposite } from "@/lib/onboarding-diagnostic";
import { accuracyToScaledMbe } from "@/lib/pass-probability";
import { supabase } from "@/lib/supabase/client";
import { NextResponse } from "next/server";

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

  const problems = await getProblemAnswers(
    body.answers.map((a) => a.problemId)
  );
  const correctById = new Map(problems.map((p) => [p.id, p.correct_option]));

  const answerRows: {
    problem_id: string;
    selected_option: number;
    is_correct: boolean;
  }[] = [];

  for (const answer of body.answers) {
    const correctOption = correctById.get(answer.problemId);
    if (correctOption == null) continue;
    answerRows.push({
      problem_id: answer.problemId,
      selected_option: answer.selectedOption,
      is_correct: answer.selectedOption === correctOption,
    });
  }

  if (answerRows.length === 0) {
    return NextResponse.json(
      { error: "None of the submitted answers matched a known problem" },
      { status: 400 }
    );
  }

  const correct = answerRows.filter((row) => row.is_correct).length;
  const accuracy = Math.round((correct / answerRows.length) * 100);
  const projectedMbe = accuracyToScaledMbe(accuracy);
  const composite = accuracyToComposite(accuracy);

  const { data: session, error: sessionError } = await supabase
    .from("quiz_sessions")
    .insert({
      user_id: user.id,
      source: "onboarding",
      score: correct,
      total_questions: answerRows.length,
      time_elapsed_seconds: body.timeElapsedSeconds ?? 0,
    })
    .select("id")
    .single();

  if (sessionError) throw sessionError;

  const { error: answersError } = await supabase.from("quiz_answers").insert(
    answerRows.map((row) => ({
      session_id: session.id,
      problem_id: row.problem_id,
      selected_option: row.selected_option,
      is_correct: row.is_correct,
    }))
  );
  if (answersError) throw answersError;

  await updateUser(externalId, {
    startComposite: composite,
    currentComposite: composite,
  });

  await updateOnboardingProgress(user.id, { currentStep: "goals" });

  return NextResponse.json({
    accuracy,
    projectedMbe,
    correct,
    totalQuestions: answerRows.length,
  });
}
