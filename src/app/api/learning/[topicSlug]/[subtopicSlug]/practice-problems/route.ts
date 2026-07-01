import { getAuthIdentity, getAppUser } from "@/lib/auth/current-user";
import {
  getSeenProblemIds,
  getUnseenSeededProblems,
} from "@/lib/db/queries/problem-stream";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ topicSlug: string; subtopicSlug: string }> }
) {
  const { userId: clerkId } = await getAuthIdentity();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await getAppUser(clerkId);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { topicSlug, subtopicSlug } = await params;
  const { searchParams } = new URL(req.url);
  const difficulty = searchParams.get("difficulty");

  const seenIds = await getSeenProblemIds(user.id);
  let problems = await getUnseenSeededProblems({
    linkage: { topicSlug, subtopicSlug },
    seenIds,
    limit: 20,
  });

  if (difficulty) {
    problems = problems.filter((p) => p.difficulty === difficulty);
  }

  return NextResponse.json({ problems: problems.slice(0, 2) });
}
