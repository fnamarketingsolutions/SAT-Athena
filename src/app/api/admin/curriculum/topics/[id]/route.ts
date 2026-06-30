import { NextResponse } from "next/server";
import { requireAthenaAdminApi } from "@/lib/auth/require-admin";
import {
  updateTopic,
  deleteTopic,
  type CurriculumSubject,
} from "@/lib/db/queries/admin-curriculum";

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
    subject?: CurriculumSubject;
    icon?: string;
    colorScheme?: string;
    orderIndex?: number;
    overview?: string;
  };

  try {
    const topic = await updateTopic(id, body);
    return NextResponse.json({ topic });
  } catch (err) {
    console.error("[admin/curriculum/topics PATCH]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update topic" },
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
    await deleteTopic(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/curriculum/topics DELETE]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete topic" },
      { status: 500 }
    );
  }
}
