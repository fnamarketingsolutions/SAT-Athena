import { getAuthIdentity, getAppUser } from "@/lib/auth/current-user";
import { updateOnboardingProgress } from "@/lib/db/queries/onboarding";
import { updateUser } from "@/lib/db/queries/users";
import { accuracyToComposite } from "@/lib/onboarding-diagnostic";
import { DEFAULT_UBE_TARGET, scaledMbeToAccuracy } from "@/lib/pass-probability";
import {
  MAX_UBE_TOTAL,
  MIN_UBE_TOTAL,
  mbeFromUbeTotal,
} from "@/lib/target-states";
import { NextResponse } from "next/server";

function clampUbeTotal(value: number) {
  if (!Number.isFinite(value)) return DEFAULT_UBE_TARGET;
  return Math.max(MIN_UBE_TOTAL, Math.min(MAX_UBE_TOTAL, Math.round(value)));
}

/**
 * Self-reported starting point, given as a UBE-style total on the 200–400
 * scale — the same scale as the target set on the next step and as the
 * `target_score` already stored on the profile.
 */
export async function POST(req: Request) {
  const { userId: externalId } = await getAuthIdentity();
  if (!externalId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getAppUser(externalId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const body = (await req.json()) as { ubeScore?: number };

  const ubeScore = clampUbeTotal(body.ubeScore ?? DEFAULT_UBE_TARGET);
  const accuracy = scaledMbeToAccuracy(mbeFromUbeTotal(ubeScore));
  const composite = accuracyToComposite(accuracy);

  await updateUser(externalId, {
    startComposite: composite,
    currentComposite: composite,
  });

  await updateOnboardingProgress(user.id, { currentStep: "goals" });

  return NextResponse.json({ ubeScore, accuracy });
}
