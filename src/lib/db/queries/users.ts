import { supabase } from "@/lib/supabase/client";
import type { AppRole } from "@/lib/auth/roles";
import { isBootstrapAdminEmail } from "@/lib/auth/admin";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapUser(row: any) {
  return {
    id: row.id,
    clerkId: row.clerk_id,
    authId: row.auth_id as string | null,
    email: row.email,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    role: (row.role ?? "learner") as AppRole,
    skillScore: row.skill_score,
    targetScore: row.target_score,
    bestStreak: row.best_streak,
    startComposite: row.start_composite,
    currentComposite: row.current_composite,
    currentReadingWriting: row.current_reading_writing,
    currentMath: row.current_math,
    totalXp: row.total_xp,
    timezone: row.timezone,
    // The homework/learning boundary: true = paid/granted, false = homework-only
    // (educator funnel), null = direct learner (trial-gated). See
    // [[project-educators-pricing]].
    learningAccess: row.learning_access as boolean | null,
    // End of a direct learner's free trial. NULL = no trial window
    // (grandfathered pre-policy accounts, or set by the DB default on signup).
    trialEndsAt: row.trial_ends_at ? new Date(row.trial_ends_at) : null,
    // Stripe billing (Family/student plan). The webhook is the only writer.
    stripeCustomerId: row.stripe_customer_id as string | null,
    stripeSubscriptionId: row.stripe_subscription_id as string | null,
    subscriptionStatus: row.subscription_status as string | null,
    onboardingCompleted: row.onboarding_completed as boolean,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/** The educator homework paywall. OFF by default ("educator access is free for
 *  now"): homework-funnel students keep full access. Set EDUCATOR_PAYWALL=1 (or
 *  true/on) to enforce homework-only gating on accounts marked FALSE. */
export function educatorPaywallEnabled() {
  return /^(1|true|on)$/i.test(process.env.EDUCATOR_PAYWALL ?? "");
}

/** The direct-learner paywall. OFF by default: consumer signups keep full
 *  access forever. Set LEARNER_PAYWALL=1 (or true/on) to enforce the free
 *  trial — once a learner's trial_ends_at passes they must subscribe. */
export function learnerPaywallEnabled() {
  return /^(1|true|on)$/i.test(process.env.LEARNER_PAYWALL ?? "");
}

/** Whether an account can reach the rich learning experience. Two independent
 *  gates share the learning_access tri-state:
 *   - true  → paid/granted: always in.
 *   - false → homework-only (educator funnel): gated only while the educator
 *             paywall is on.
 *   - null  → direct learner: gated by the learner paywall once the free trial
 *             (trial_ends_at) has elapsed. A null trial_ends_at means a
 *             grandfathered pre-policy account, which stays free. */
export function hasLearningAccess(user: {
  learningAccess: boolean | null;
  trialEndsAt: Date | null;
}) {
  if (user.learningAccess === true) return true;
  if (user.learningAccess === false) return !educatorPaywallEnabled();

  // learningAccess === null → a direct (consumer) learner.
  if (!learnerPaywallEnabled()) return true;
  if (!user.trialEndsAt) return true;
  return user.trialEndsAt.getTime() > Date.now();
}

/** Why an account is being shown the upsell — drives the wall's copy.
 *  "homework-only" = educator-funnel student; "trial-expired" = a direct
 *  learner whose free trial ran out. Only meaningful when hasLearningAccess
 *  is false. */
export type LearningGateReason = "homework-only" | "trial-expired";

export function learningGateReason(user: {
  learningAccess: boolean | null;
}): LearningGateReason {
  return user.learningAccess === false ? "homework-only" : "trial-expired";
}

/** Mark an account homework-only — but ONLY if access was never established
 *  (NULL). Existing/grandfathered users (true) and already-gated users
 *  (false) are left untouched, so signing in to do homework never revokes a
 *  real learner's access. No-op while the paywall is off (nobody is gated). */
export async function gateAccountAsHomeworkOnly(userId: string) {
  if (!educatorPaywallEnabled()) return;
  const { error } = await supabase
    .from("users")
    .update({ learning_access: false })
    .eq("id", userId)
    .is("learning_access", null);
  if (error) throw error;
}

// ─── Stripe billing ──────────────────────────────────────────────────────

/** Subscription statuses that should grant the full learning experience.
 *  `past_due` is included so a failed-then-retrying card keeps access during
 *  Stripe's dunning grace window rather than yanking it mid-retry. */
const ACTIVE_SUBSCRIPTION_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
]);

export async function getUserByStripeCustomerId(customerId: string) {
  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  return data ? mapUser(data) : null;
}

/** Persist the Stripe Customer id on the user row (set once, at first checkout). */
export async function setStripeCustomerId(userId: string, customerId: string) {
  const { error } = await supabase
    .from("users")
    .update({ stripe_customer_id: customerId, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) throw error;
}

/**
 * Reconcile local billing state from a Stripe subscription event. Persists the
 * subscription id + status and flips `learning_access` to match: an active
 * subscription unlocks learning, a canceled/unpaid one re-gates the account.
 * This is the only path (besides gateAccountAsHomeworkOnly) that writes
 * `learning_access`, and it only ever runs for accounts that reached checkout.
 */
export async function applySubscriptionState(
  customerId: string,
  state: { subscriptionId: string | null; status: string }
) {
  const grant = ACTIVE_SUBSCRIPTION_STATUSES.has(state.status);
  const { error } = await supabase
    .from("users")
    .update({
      stripe_subscription_id: state.subscriptionId,
      subscription_status: state.status,
      learning_access: grant,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_customer_id", customerId);
  if (error) throw error;
}

export async function getUserByClerkId(clerkId: string) {
  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("clerk_id", clerkId)
    .limit(1)
    .single();

  return data ? mapUser(data) : null;
}

/** Resolve the app user from a Supabase auth uid. The provisioning trigger
 *  (handle_new_auth_user) guarantees a row exists for any signed-in account,
 *  but `maybeSingle` keeps this null-safe during the dual-stack transition. */
export async function getUserByAuthId(authId: string) {
  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("auth_id", authId)
    .maybeSingle();

  return data ? mapUser(data) : null;
}

export async function createUser(data: {
  clerkId: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
}) {
  const { data: row } = await supabase
    .from("users")
    .upsert(
      {
        clerk_id: data.clerkId,
        email: data.email,
        display_name: data.displayName ?? null,
        avatar_url: data.avatarUrl ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "clerk_id" }
    )
    .select()
    .single();

  const mapped = row ? mapUser(row) : null;
  if (mapped) {
    await ensureBootstrapAdminRole(mapped.id, mapped.email);
    if (isBootstrapAdminEmail(mapped.email)) {
      return getUserByClerkId(data.clerkId);
    }
  }
  return mapped;
}

/** Promote bootstrap admins from ATHENA_ADMIN_EMAILS on first sync. */
export async function ensureBootstrapAdminRole(userId: string, email: string) {
  if (!isBootstrapAdminEmail(email)) return;
  await supabase
    .from("users")
    .update({ role: "admin", updated_at: new Date().toISOString() })
    .eq("id", userId)
    .eq("role", "learner");
}

export async function updateUser(
  clerkId: string,
  data: Partial<{
    displayName: string;
    avatarUrl: string;
    skillScore: number;
    targetScore: number;
    bestStreak: number;
    startComposite: number;
    currentComposite: number;
    currentReadingWriting: number;
    currentMath: number;
    totalXp: number;
    timezone: string;
    onboardingCompleted: boolean;
  }>
) {
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (data.displayName !== undefined) update.display_name = data.displayName;
  if (data.avatarUrl !== undefined) update.avatar_url = data.avatarUrl;
  if (data.skillScore !== undefined) update.skill_score = data.skillScore;
  if (data.targetScore !== undefined) update.target_score = data.targetScore;
  if (data.bestStreak !== undefined) update.best_streak = data.bestStreak;
  if (data.startComposite !== undefined) update.start_composite = data.startComposite;
  if (data.currentComposite !== undefined) update.current_composite = data.currentComposite;
  if (data.currentReadingWriting !== undefined) update.current_reading_writing = data.currentReadingWriting;
  if (data.currentMath !== undefined) update.current_math = data.currentMath;
  if (data.totalXp !== undefined) update.total_xp = data.totalXp;
  if (data.timezone !== undefined) update.timezone = data.timezone;
  if (data.onboardingCompleted !== undefined) {
    update.onboarding_completed = data.onboardingCompleted;
  }

  const { data: row } = await supabase
    .from("users")
    .update(update)
    .eq("clerk_id", clerkId)
    .select()
    .single();

  return row ? mapUser(row) : null;
}
