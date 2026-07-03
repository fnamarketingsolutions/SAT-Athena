import { getAuthIdentity, getAppUser } from "@/lib/auth/current-user";
import { updateUser } from "@/lib/db/queries/users";
import { getProfileData } from "@/lib/db/queries/profile";
import { getLastCompletedAttempt } from "@/lib/db/queries/full-sat";
import {
  getMbeRankProgress,
  MBE_PASS_PERCENT,
  MBE_RANKS,
} from "@/lib/exam-config";
import { supabase } from "@/lib/supabase/client";
import { NextResponse } from "next/server";

const DAY_ABBREVS = ["S", "M", "T", "W", "T", "F", "S"];

export async function GET() {
  const { userId: clerkId } = await getAuthIdentity();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getAppUser(clerkId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const [profileData, lastAttempt] = await Promise.all([
    getProfileData(user.id),
    getLastCompletedAttempt(user.id),
  ]);

  const rankProgress = getMbeRankProgress(profileData.overallAccuracy);

  let latestMockAttempt: {
    id: string;
    correct: number;
    total: number;
    percentScore: number | null;
    passed: boolean;
    completedAt: string | null;
  } | null = null;

  if (lastAttempt) {
    const { count } = await supabase
      .from("full_sat_answers")
      .select("id", { count: "exact", head: true })
      .eq("attempt_id", lastAttempt.id);

    const correct =
      (lastAttempt.rwRawScore ?? 0) + (lastAttempt.mathRawScore ?? 0);
    const total = count ?? 0;
    const percentScore =
      total > 0 ? Math.round((correct / total) * 100) : null;

    latestMockAttempt = {
      id: lastAttempt.id,
      correct,
      total,
      percentScore,
      passed: percentScore != null && percentScore >= MBE_PASS_PERCENT,
      completedAt: lastAttempt.completedAt,
    };
  }

  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfWeekStr = startOfWeek.toISOString().split("T")[0];
  const today = new Date().toISOString().split("T")[0];

  const { data: weekQuestsData } = await supabase
    .from("daily_quests")
    .select("quest_date")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .gte("quest_date", startOfWeekStr)
    .lte("quest_date", today);

  const completedDates = new Set(
    (weekQuestsData ?? []).map((q: { quest_date: string }) => q.quest_date)
  );

  const weeklyStreakDays = DAY_ABBREVS.map((abbrev, idx) => {
    const dayDate = new Date(startOfWeek);
    dayDate.setDate(startOfWeek.getDate() + idx);
    const dateStr = dayDate.toISOString().split("T")[0];
    const completed = completedDates.has(dateStr);
    const isPast = dateStr < today && !completed;
    return { day: abbrev, completed, isPast };
  });

  return NextResponse.json({
    ...profileData,
    latestMockAttempt,
    weeklyStreakDays,
    rank: {
      current: {
        name: rankProgress.current.name,
        description: rankProgress.current.description,
        emoji: rankProgress.current.emoji,
        threshold: rankProgress.current.threshold,
      },
      next: rankProgress.next
        ? {
            name: rankProgress.next.name,
            description: rankProgress.next.description,
            emoji: rankProgress.next.emoji,
            threshold: rankProgress.next.threshold,
          }
        : null,
      pct: rankProgress.pct,
      pointsToNext: rankProgress.pointsToNext,
    },
    tiers: MBE_RANKS.map((r) => ({
      name: r.name,
      threshold: r.threshold,
      description: r.description,
      emoji: r.emoji,
      active: profileData.overallAccuracy >= r.threshold,
    })),
  });
}

export async function PATCH(req: Request) {
  const { userId: clerkId } = await getAuthIdentity();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const displayName = typeof body.displayName === "string"
    ? body.displayName.trim()
    : null;

  if (!displayName || displayName.length === 0 || displayName.length > 50) {
    return NextResponse.json(
      { error: "Display name must be 1-50 characters" },
      { status: 400 }
    );
  }

  const updated = await updateUser(clerkId, { displayName });
  if (!updated) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ displayName: updated.displayName });
}
