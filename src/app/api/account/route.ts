import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isSupabaseAuth } from "@/lib/auth/provider";
import { supabase } from "@/lib/supabase/client";

/**
 * Permanently delete the signed-in Clerk user and their app row.
 * Related rows cascade via public.users FKs.
 */
export async function DELETE() {
  if (isSupabaseAuth()) {
    return NextResponse.json({ error: "Not available" }, { status: 400 });
  }

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error: dbError } = await supabase
    .from("users")
    .delete()
    .eq("clerk_id", userId);

  if (dbError) {
    console.error("[account/delete] db", dbError.message);
    return NextResponse.json(
      { error: "Failed to delete account data" },
      { status: 500 }
    );
  }

  try {
    const client = await clerkClient();
    await client.users.deleteUser(userId);
  } catch (err) {
    console.error("[account/delete] clerk", err);
    return NextResponse.json(
      { error: "Account data removed, but auth delete failed. Contact support." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
