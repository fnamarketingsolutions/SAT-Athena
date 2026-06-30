import { getAuthIdentity, getAppUser } from "@/lib/auth/current-user";
import { getAnalyticsDashboard } from "@/lib/db/queries/analytics-dashboard";
import { NextResponse } from "next/server";

export async function GET() {
  const { userId: externalId } = await getAuthIdentity();
  if (!externalId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getAppUser(externalId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const data = await getAnalyticsDashboard(user.id, {
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    targetScore: user.targetScore,
    skillScore: user.skillScore,
    startComposite: user.startComposite,
    currentComposite: user.currentComposite,
    currentReadingWriting: user.currentReadingWriting,
    currentMath: user.currentMath,
    bestStreak: user.bestStreak,
  });

  return NextResponse.json(data);
}
