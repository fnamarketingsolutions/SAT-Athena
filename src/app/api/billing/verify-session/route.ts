import { NextResponse } from "next/server";
import { getAuthIdentity, getAppUser } from "@/lib/auth/current-user";
import { reconcileCheckoutSession } from "@/lib/stripe/reconcile-checkout";

export const runtime = "nodejs";

/**
 * Client-callable fallback after Checkout when webhooks are not configured.
 */
export async function POST(req: Request) {
  const { userId: externalId } = await getAuthIdentity();
  if (!externalId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getAppUser(externalId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as { sessionId?: string };
  const sessionId = body.sessionId?.trim();
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  try {
    await reconcileCheckoutSession(sessionId, user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[billing/verify-session] failed", err);
    const message = err instanceof Error ? err.message : "Verification failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
