import { NextResponse } from "next/server";
import { requireAthenaAdminApi } from "@/lib/auth/require-admin";
import { getAdminOverview } from "@/lib/db/queries/admin-users";

export async function GET() {
  const denied = await requireAthenaAdminApi();
  if (denied) return denied;

  try {
    const overview = await getAdminOverview();
    return NextResponse.json(overview);
  } catch (err) {
    console.error("[admin/overview]", err);
    return NextResponse.json({ error: "Failed to load overview" }, { status: 500 });
  }
}
