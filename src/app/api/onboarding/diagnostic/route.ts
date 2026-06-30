import { getAuthIdentity } from "@/lib/auth/current-user";
import { getOnboardingDiagnosticProblems } from "@/lib/db/queries/onboarding";
import { NextResponse } from "next/server";

export async function GET() {
  const { userId } = await getAuthIdentity();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const problems = await getOnboardingDiagnosticProblems();
  if (problems.length === 0) {
    return NextResponse.json(
      { error: "No diagnostic problems configured" },
      { status: 404 }
    );
  }

  return NextResponse.json({ problems });
}
