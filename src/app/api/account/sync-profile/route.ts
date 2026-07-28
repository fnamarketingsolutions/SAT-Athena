import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isSupabaseAuth } from "@/lib/auth/provider";
import { updateUser } from "@/lib/db/queries/users";

/** Copy Clerk primary email + image into public.users after client-side changes. */
export async function POST() {
  if (isSupabaseAuth()) {
    return NextResponse.json({ error: "Not available" }, { status: 400 });
  }

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clerkUser = await currentUser();
  if (!clerkUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const email = clerkUser.primaryEmailAddress?.emailAddress?.trim();
  const avatarUrl = clerkUser.imageUrl || undefined;

  const updated = await updateUser(userId, {
    ...(email ? { email } : {}),
    ...(avatarUrl ? { avatarUrl } : {}),
  });

  if (!updated) {
    return NextResponse.json({ error: "App user not found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    email: updated.email,
    avatarUrl: updated.avatarUrl,
  });
}
