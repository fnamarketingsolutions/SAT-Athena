import { NextResponse } from "next/server";
import { getAuthIdentity, getAppUser } from "@/lib/auth/current-user";
import { isAppRole } from "@/lib/auth/roles";
import { requireAthenaAdminApi } from "@/lib/auth/require-admin";
import {
  adminUpdateUser,
  getAdminUserById,
} from "@/lib/db/queries/admin-users";
import { getStripe } from "@/lib/stripe/client";
import { applySubscriptionState } from "@/lib/db/queries/users";
import { supabase } from "@/lib/supabase/client";

type Params = { params: Promise<{ userId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const denied = await requireAthenaAdminApi();
  if (denied) return denied;

  const { userId } = await params;
  try {
    const user = await getAdminUserById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ user });
  } catch (err) {
    console.error("[admin/users/:id GET]", err);
    return NextResponse.json({ error: "Failed to load user" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: Params) {
  const denied = await requireAthenaAdminApi();
  if (denied) return denied;

  const { userId } = await params;
  const body = (await req.json()) as {
    learningAccess?: boolean | null;
    trialEndsAt?: string | null;
    onboardingCompleted?: boolean;
    displayName?: string;
    role?: string;
    action?: "sync_stripe" | "grant_access" | "revoke_access" | "extend_trial_14d";
  };

  try {
    if (body.role !== undefined && !isAppRole(body.role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    if (body.action === "sync_stripe") {
      const user = await getAdminUserById(userId);
      if (!user?.stripeCustomerId) {
        return NextResponse.json({ error: "No Stripe customer on file" }, { status: 400 });
      }
      const stripe = getStripe();
      const subs = await stripe.subscriptions.list({
        customer: user.stripeCustomerId,
        limit: 1,
        status: "all",
      });
      const sub = subs.data[0];
      if (!sub) {
        await adminUpdateUser(userId, {
          learningAccess: false,
        });
        await supabase
          .from("users")
          .update({
            stripe_subscription_id: null,
            subscription_status: "canceled",
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);
      } else {
        await applySubscriptionState(user.stripeCustomerId, {
          subscriptionId: sub.id,
          status: sub.status,
        });
      }
    } else if (body.action === "grant_access") {
      await adminUpdateUser(userId, { learningAccess: true });
    } else if (body.action === "revoke_access") {
      await adminUpdateUser(userId, { learningAccess: false });
    } else if (body.action === "extend_trial_14d") {
      const until = new Date();
      until.setDate(until.getDate() + 14);
      await adminUpdateUser(userId, {
        learningAccess: null,
        trialEndsAt: until.toISOString(),
      });
    } else {
      if (body.role !== undefined && body.role !== "admin") {
        const { userId: callerId } = await getAuthIdentity();
        const caller = callerId ? await getAppUser(callerId) : null;
        if (caller?.id === userId) {
          return NextResponse.json(
            { error: "You cannot remove your own admin role" },
            { status: 400 }
          );
        }
      }
      await adminUpdateUser(userId, {
        learningAccess: body.learningAccess,
        trialEndsAt: body.trialEndsAt,
        onboardingCompleted: body.onboardingCompleted,
        displayName: body.displayName,
        role: body.role as "learner" | "educator" | "admin" | undefined,
      });
    }

    const user = await getAdminUserById(userId);
    return NextResponse.json({ user });
  } catch (err) {
    console.error("[admin/users/:id PATCH]", err);
    const message = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
