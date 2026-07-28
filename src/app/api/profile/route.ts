import { getAuthIdentity, getAppUser } from "@/lib/auth/current-user";
import { updateUser } from "@/lib/db/queries/users";
import { getProfileData } from "@/lib/db/queries/profile";
import {
  getLastCompletedAttempt,
  getUserAttempts,
} from "@/lib/db/queries/full-sat";
import { computePassProbability } from "@/lib/pass-probability";
import { supabase } from "@/lib/supabase/client";
import { NextResponse } from "next/server";

export async function GET() {
  const { userId: clerkId } = await getAuthIdentity();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getAppUser(clerkId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const [profileData, lastAttempt, allAttempts, completedQuestsRes] =
    await Promise.all([
      getProfileData(user.id),
      getLastCompletedAttempt(user.id),
      getUserAttempts(user.id),
      supabase
        .from("daily_quests")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "completed"),
    ]);

  let latestMockAccuracy: number | null = null;

  if (lastAttempt) {
    const { count } = await supabase
      .from("full_sat_answers")
      .select("id", { count: "exact", head: true })
      .eq("attempt_id", lastAttempt.id);

    const correct =
      (lastAttempt.rwRawScore ?? 0) + (lastAttempt.mathRawScore ?? 0);
    const total = count ?? 0;
    latestMockAccuracy =
      total > 0 ? Math.round((correct / total) * 100) : null;
  }

  const completedMockExams = allAttempts.filter(
    (a) => a.status === "completed"
  ).length;
  const completedDailyPractices = completedQuestsRes.count ?? 0;

  const passProbability = computePassProbability({
    targetScore: user.targetScore,
    practiceAccuracyPercent: profileData.overallAccuracy,
    latestMockAccuracyPercent: latestMockAccuracy,
    completedDailyPractices,
    completedMockExams,
  });

  return NextResponse.json({
    ...profileData,
    passProbability,
  });
}

export async function PATCH(req: Request) {
  const { userId: clerkId } = await getAuthIdentity();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  const updates: {
    displayName?: string;
    targetScore?: number;
  } = {};

  if (typeof body.displayName === "string") {
    const displayName = body.displayName.trim();
    if (!displayName || displayName.length > 50) {
      return NextResponse.json(
        { error: "Display name must be 1-50 characters" },
        { status: 400 }
      );
    }
    updates.displayName = displayName;
  }

  if (typeof body.targetScore === "number") {
    const target = Math.round(body.targetScore);
    if (target < 200 || target > 400) {
      return NextResponse.json(
        { error: "Target score must be between 200 and 400" },
        { status: 400 }
      );
    }
    updates.targetScore = target;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  const updated = await updateUser(clerkId, updates);
  if (!updated) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    displayName: updated.displayName,
    targetScore: updated.targetScore,
  });
}
