import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isSupabaseAuth } from "@/lib/auth/provider";
import { supabase } from "@/lib/supabase/client";

/**
 * After Clerk primary email changes, copy it into public.users.email so
 * roster matching and app identity stay in sync.
 */
export async function POST() {
  if (isSupabaseAuth()) {
    return NextResponse.json({ error: "Not available" }, { status: 400 });
  }

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clerkUser = await currentUser();
  const email = clerkUser?.primaryEmailAddress?.emailAddress?.trim();
  if (!email) {
    return NextResponse.json({ error: "No primary email on account" }, { status: 400 });
  }

  const { error } = await supabase
    .from("users")
    .update({ email, updated_at: new Date().toISOString() })
    .eq("clerk_id", userId);

  if (error) {
    console.error("[account/sync-email]", error.message);
    return NextResponse.json({ error: "Failed to sync email" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, email });
}
