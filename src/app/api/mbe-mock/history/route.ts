import { getAuthIdentity, getAppUser } from "@/lib/auth/current-user";
import { getUserAttempts } from "@/lib/db/queries/full-sat";
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

  const attempts = await getUserAttempts(user.id);
  const attemptIds = attempts.map((a) => a.id);

  const answeredByAttempt = new Map<string, number>();
  const totalByAttempt = new Map<string, number>();

  if (attemptIds.length > 0) {
    const { data: answers } = await (supabase as any)
      .from("full_sat_answers")
      .select("attempt_id, selected_option")
      .in("attempt_id", attemptIds);

    for (const row of answers ?? []) {
      totalByAttempt.set(
        row.attempt_id,
        (totalByAttempt.get(row.attempt_id) ?? 0) + 1
      );
      if (row.selected_option != null) {
        answeredByAttempt.set(
          row.attempt_id,
          (answeredByAttempt.get(row.attempt_id) ?? 0) + 1
        );
      }
    }
  }

  return NextResponse.json({
    attempts: attempts.map((a) => ({
      ...a,
      answeredCount: answeredByAttempt.get(a.id) ?? 0,
      questionCount: totalByAttempt.get(a.id) ?? 0,
    })),
  });
}
