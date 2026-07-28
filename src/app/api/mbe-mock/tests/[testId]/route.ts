import { getAuthIdentity, getAppUser } from "@/lib/auth/current-user";
import { discardMockTest } from "@/lib/db/queries/full-sat";
import { NextResponse } from "next/server";

/** Discard (retire) an unused mock exam from Available Tests. */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ testId: string }> }
) {
  const { userId: clerkId } = await getAuthIdentity();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getAppUser(clerkId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { testId } = await params;
  if (!testId) {
    return NextResponse.json({ error: "testId is required" }, { status: 400 });
  }

  try {
    await discardMockTest(testId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to discard mock exam";
    const status =
      message.includes("not found")
        ? 404
        : message.includes("in progress")
          ? 409
          : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
