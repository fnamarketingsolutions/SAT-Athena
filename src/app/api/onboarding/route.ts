import { getAuthIdentity, getAppUser } from "@/lib/auth/current-user";
import {
  ensureOnboardingProgress,
  updateOnboardingProgress,
  type OnboardingStep,
} from "@/lib/db/queries/onboarding";
import { updateUser } from "@/lib/db/queries/users";
import { NextResponse } from "next/server";

const VALID_STEPS = new Set<OnboardingStep>([
  "welcome",
  "baseline",
  "diagnostic",
  "self_report",
  "goals",
  "schedule",
  "done",
]);

export async function GET() {
  const { userId: externalId } = await getAuthIdentity();
  if (!externalId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getAppUser(externalId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const progress = user.onboardingCompleted
    ? null
    : await ensureOnboardingProgress(user.id);

  return NextResponse.json({
    completed: user.onboardingCompleted,
    progress: progress
      ? {
          currentStep: progress.currentStep,
          quizQuestionIndex: progress.quizQuestionIndex,
          lessonPreference: progress.lessonPreference,
        }
      : null,
    scores: {
      targetScore: user.targetScore,
      currentComposite: user.currentComposite,
      currentReadingWriting: user.currentReadingWriting,
      currentMath: user.currentMath,
      startComposite: user.startComposite,
    },
  });
}

export async function PATCH(req: Request) {
  const { userId: externalId } = await getAuthIdentity();
  if (!externalId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getAppUser(externalId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const body = (await req.json()) as {
    step?: string;
    quizQuestionIndex?: number;
    lessonPreference?: string | null;
    targetScore?: number;
  };

  if (body.step && !VALID_STEPS.has(body.step as OnboardingStep)) {
    return NextResponse.json({ error: "Invalid step" }, { status: 400 });
  }

  if (body.targetScore !== undefined) {
    const target = Math.round(body.targetScore);
    if (target < 400 || target > 1600 || target % 10 !== 0) {
      return NextResponse.json(
        { error: "Target score must be between 400 and 1600" },
        { status: 400 }
      );
    }
    await updateUser(externalId, { targetScore: target });
  }

  if (body.step || body.quizQuestionIndex !== undefined || body.lessonPreference !== undefined) {
    await ensureOnboardingProgress(user.id);
    await updateOnboardingProgress(user.id, {
      currentStep: body.step as OnboardingStep | undefined,
      quizQuestionIndex: body.quizQuestionIndex,
      lessonPreference: body.lessonPreference,
    });
  }

  return NextResponse.json({ ok: true });
}
