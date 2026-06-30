import { getAuthIdentity, getAppUser } from "@/lib/auth/current-user";
import { getQuestAccountabilityStatus } from "@/lib/accountability/quest-lock";
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

  const status = await getQuestAccountabilityStatus(user.id, {
    onboardingCompleted: user.onboardingCompleted,
  });

  return NextResponse.json(status);
}
