import { getAuthIdentity, getAppUser } from "@/lib/auth/current-user";
import {
  createGeneratedMockTest,
  getInProgressAttempt,
  getLastCompletedAttempt,
} from "@/lib/db/queries/full-sat";
import {
  generateMockExamQuestions,
} from "@/lib/mbe-mock/generate";
import { MOCK_EXAM_QUESTION_COUNT } from "@/lib/mbe-mock/constants";
import { FULL_SAT_COOLDOWN_MS } from "@/types/full-sat";
import { NextResponse } from "next/server";

/** 100-question generation runs 7 subject batches in parallel. */
export const maxDuration = 300;

export async function POST() {
  const { userId: clerkId } = await getAuthIdentity();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getAppUser(clerkId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const existing = await getInProgressAttempt(user.id);
  if (existing) {
    return NextResponse.json(
      {
        error: "You already have a mock exam in progress. Resume it first.",
        attemptId: existing.id,
      },
      { status: 409 }
    );
  }

  const lastCompleted = await getLastCompletedAttempt(user.id);
  if (lastCompleted?.completedAt) {
    const elapsed = Date.now() - new Date(lastCompleted.completedAt).getTime();
    if (elapsed < FULL_SAT_COOLDOWN_MS) {
      const nextDate = new Date(
        new Date(lastCompleted.completedAt).getTime() + FULL_SAT_COOLDOWN_MS
      ).toISOString();
      return NextResponse.json(
        { error: "Cooldown active", nextAvailableDate: nextDate },
        { status: 403 }
      );
    }
  }

  try {
    const generated = await generateMockExamQuestions(user.id);
    const stamp = new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    const test = await createGeneratedMockTest({
      name: `AI Mock Exam · ${stamp}`,
      problems: generated.map((q) => ({
        questionText: q.questionText,
        options: q.options,
        correctOption: q.correctOption,
        explanation: q.explanation,
        hint: q.hint,
        difficulty: q.difficulty,
        topicSlug: q.subject,
      })),
    });

    return NextResponse.json({
      test,
      questionCount: generated.length,
      expectedCount: MOCK_EXAM_QUESTION_COUNT,
    });
  } catch (err) {
    console.error("[mbe-mock/generate]", err);
    const message =
      err instanceof Error ? err.message : "Failed to generate mock exam";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
