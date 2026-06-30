import { getAuthIdentity, getAppUser } from "@/lib/auth/current-user";
import { isAthenaAdmin } from "@/lib/auth/admin";
import { NextResponse } from "next/server";

export async function GET() {
  const { userId } = await getAuthIdentity();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getAppUser(userId);
  if (!user) {
    return NextResponse.json({ error: "User not found in DB" }, { status: 404 });
  }

  return NextResponse.json({
    user,
    isAdmin: isAthenaAdmin(user),
  });
}
