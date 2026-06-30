import { NextResponse } from "next/server";
import { requireAthenaAdminApi } from "@/lib/auth/require-admin";
import { updateSubtopic, deleteSubtopic } from "@/lib/db/queries/admin-curriculum";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAthenaAdminApi();
  if (denied) return denied;

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    slug?: string;
    orderIndex?: number;
    description?: string;
    difficulty?: string;
    estimatedMinutes?: number;
  };

  try {
    const subtopic = await updateSubtopic(id, body);
    return NextResponse.json({ subtopic });
  } catch (err) {
    console.error("[admin/curriculum/subtopics PATCH]", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to update subtopic",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAthenaAdminApi();
  if (denied) return denied;

  const { id } = await params;

  try {
    await deleteSubtopic(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/curriculum/subtopics DELETE]", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to delete subtopic",
      },
      { status: 500 }
    );
  }
}
