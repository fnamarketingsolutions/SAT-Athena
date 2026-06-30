import { NextResponse } from "next/server";
import { requireAthenaAdminApi } from "@/lib/auth/require-admin";
import { listAdminUsers, type AccessTier } from "@/lib/db/queries/admin-users";

export async function GET(req: Request) {
  const denied = await requireAthenaAdminApi();
  if (denied) return denied;

  const url = new URL(req.url);
  const search = url.searchParams.get("search") ?? undefined;
  const access = (url.searchParams.get("access") ?? "all") as AccessTier | "all";
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 50)));
  const offset = Math.max(0, Number(url.searchParams.get("offset") ?? 0));

  try {
    const result = await listAdminUsers({ search, access, limit, offset });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[admin/users]", err);
    return NextResponse.json({ error: "Failed to load users" }, { status: 500 });
  }
}
