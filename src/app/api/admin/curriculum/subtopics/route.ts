import { NextResponse } from "next/server";
import { requireAthenaAdminApi } from "@/lib/auth/require-admin";
import { createSubtopic } from "@/lib/db/queries/admin-curriculum";

export async function POST(req: Request) {
  const denied = await requireAthenaAdminApi();
  if (denied) return denied;

  const body = (await req.json().catch(() => ({}))) as {
    topicId?: string;
    name?: string;
    slug?: string;
    orderIndex?: number;
    description?: string;
    difficulty?: string;
    estimatedMinutes?: number;
  };

  if (!body.topicId) {
    return NextResponse.json({ error: "topicId is required" }, { status: 400 });
  }
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  try {
    const subtopic = await createSubtopic({
      topicId: body.topicId,
      name: body.name,
      slug: body.slug,
      orderIndex: body.orderIndex,
      description: body.description,
      difficulty: body.difficulty,
      estimatedMinutes: body.estimatedMinutes,
    });
    return NextResponse.json({ subtopic }, { status: 201 });
  } catch (err) {
    console.error("[admin/curriculum/subtopics POST]", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to create subtopic",
      },
      { status: 500 }
    );
  }
}
