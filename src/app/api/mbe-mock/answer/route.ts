import { getAuthIdentity, getAppUser } from "@/lib/auth/current-user";
import {
  upsertAnswer,
  updateAttemptPosition,
} from "@/lib/db/queries/full-sat";
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
  const {
    attemptId,
    problemId,
    section,
    module,
    orderIndex,
    selectedOption,
    responseTimeMs,
  } = body as {
    attemptId: string;
    problemId: string;
    section: string;
    module: number;
    orderIndex: number;
    selectedOption: number;
    responseTimeMs?: number;
  };

  if (
    !attemptId ||
    !problemId ||
    !section ||
    module == null ||
    orderIndex == null ||
    selectedOption == null
  ) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Grade server-side so the client never needs the answer key mid-exam.
  const { data: problemRow } = await supabase
    .from("problems")
    .select("correct_option")
    .eq("id", problemId)
    .maybeSingle();

  const correctOption =
    typeof problemRow?.correct_option === "number"
      ? problemRow.correct_option
      : null;
  const isCorrect =
    correctOption != null ? selectedOption === correctOption : false;

  await upsertAnswer(attemptId, {
    problemId,
    section,
    module,
    orderIndex,
    selectedOption,
    isCorrect,
    responseTimeMs,
  });

  await updateAttemptPosition(attemptId, {
    currentSection: section,
    currentModule: module,
    currentQuestion: orderIndex,
  });

  // Do not return correctness — feedback is delayed until the summary.
  return NextResponse.json({ ok: true });
}
