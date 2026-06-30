import { getAuthIdentity, getAppUser } from "@/lib/auth/current-user";
import { updateOnboardingProgress } from "@/lib/db/queries/onboarding";
import { updateUser } from "@/lib/db/queries/users";
import { NextResponse } from "next/server";

function clampSectionScore(value: number) {
  return Math.max(200, Math.min(800, Math.round(value / 10) * 10));
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
    readingWriting?: number;
    math?: number;
  };

  const rw = clampSectionScore(body.readingWriting ?? 500);
  const math = clampSectionScore(body.math ?? 500);
  const composite = rw + math;

  await updateUser(externalId, {
    startComposite: composite,
    currentComposite: composite,
    currentReadingWriting: rw,
    currentMath: math,
  });

  await updateOnboardingProgress(user.id, { currentStep: "goals" });

  return NextResponse.json({ rw, math, composite });
}
