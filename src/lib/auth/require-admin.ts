import { NextResponse } from "next/server";
import { getAuthIdentity, getAppUser } from "@/lib/auth/current-user";
import { isAthenaAdmin } from "@/lib/auth/admin";

/** API route guard — returns a 403 response or null if the caller is a platform admin. */
export async function requireAthenaAdminApi() {
  const { userId } = await getAuthIdentity();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getAppUser(userId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (!isAthenaAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return null;
}
