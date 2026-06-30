import "server-only";

import { supabase } from "@/lib/supabase/client";
import type { AppRole } from "@/lib/auth/roles";
import {
  hasLearningAccess,
  learnerPaywallEnabled,
  educatorPaywallEnabled,
} from "@/lib/db/queries/users";

export type AccessTier =
  | "subscribed"
  | "comped"
  | "trial"
  | "trial_expired"
  | "homework_only"
  | "grandfathered";

export type AdminUserRow = {
  id: string;
  email: string;
  displayName: string | null;
  role: AppRole;
  createdAt: string;
  learningAccess: boolean | null;
  trialEndsAt: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionStatus: string | null;
  onboardingCompleted: boolean;
  currentComposite: number | null;
  targetScore: number | null;
  bestStreak: number;
  totalXp: number;
  hasAccess: boolean;
  accessTier: AccessTier;
  questsCompleted: number;
  quizSessions: number;
  fullSatsCompleted: number;
};

export function resolveAccessTier(user: {
  learningAccess: boolean | null | undefined;
  trialEndsAt: Date | null;
  subscriptionStatus: string | null;
}): AccessTier {
  const active = ["active", "trialing", "past_due"].includes(
    user.subscriptionStatus ?? ""
  );
  if (active) return "subscribed";

  if (user.learningAccess === true) return "comped";
  if (user.learningAccess === false) return "homework_only";
  if (!learnerPaywallEnabled()) return "grandfathered";
  if (!user.trialEndsAt) return "grandfathered";
  return user.trialEndsAt.getTime() > Date.now() ? "trial" : "trial_expired";
}

function mapRow(
  row: Record<string, unknown>,
  counts: { quests: number; quizzes: number; fullSats: number }
): AdminUserRow {
  const trialEndsAt = row.trial_ends_at as string | null;
  const trialDate = trialEndsAt ? new Date(trialEndsAt) : null;
  const learningAccess = row.learning_access as boolean | null;
  const subscriptionStatus = row.subscription_status as string | null;

  const pseudoUser = { learningAccess, trialEndsAt: trialDate };
  const hasAccess = hasLearningAccess(pseudoUser);

  return {
    id: row.id as string,
    email: row.email as string,
    displayName: row.display_name as string | null,
    role: ((row.role as AppRole) ?? "learner"),
    createdAt: row.created_at as string,
    learningAccess,
    trialEndsAt,
    stripeCustomerId: row.stripe_customer_id as string | null,
    stripeSubscriptionId: row.stripe_subscription_id as string | null,
    subscriptionStatus,
    onboardingCompleted: row.onboarding_completed as boolean,
    currentComposite: row.current_composite as number | null,
    targetScore: row.target_score as number | null,
    bestStreak: (row.best_streak as number) ?? 0,
    totalXp: (row.total_xp as number) ?? 0,
    hasAccess,
    accessTier: resolveAccessTier({
      learningAccess,
      trialEndsAt: trialDate,
      subscriptionStatus,
    }),
    questsCompleted: counts.quests,
    quizSessions: counts.quizzes,
    fullSatsCompleted: counts.fullSats,
  };
}

async function activityCountsForUsers(
  userIds: string[]
): Promise<Map<string, { quests: number; quizzes: number; fullSats: number }>> {
  const map = new Map<string, { quests: number; quizzes: number; fullSats: number }>();
  for (const id of userIds) {
    map.set(id, { quests: 0, quizzes: 0, fullSats: 0 });
  }
  if (userIds.length === 0) return map;

  const [questsRes, quizzesRes, satsRes] = await Promise.all([
    supabase
      .from("daily_quests")
      .select("user_id")
      .in("user_id", userIds)
      .eq("status", "completed"),
    supabase.from("quiz_sessions").select("user_id").in("user_id", userIds),
    supabase
      .from("full_sat_attempts")
      .select("user_id")
      .in("user_id", userIds)
      .eq("status", "completed"),
  ]);

  for (const row of questsRes.data ?? []) {
    const c = map.get(row.user_id)!;
    c.quests++;
  }
  for (const row of quizzesRes.data ?? []) {
    const c = map.get(row.user_id)!;
    c.quizzes++;
  }
  for (const row of satsRes.data ?? []) {
    const c = map.get(row.user_id)!;
    c.fullSats++;
  }

  return map;
}

export type ListUsersOptions = {
  search?: string;
  access?: AccessTier | "all";
  limit?: number;
  offset?: number;
};

const ACTIVE_SUBSCRIPTION_STATUSES = ["active", "trialing", "past_due"] as const;

export async function listAdminUsers(options: ListUsersOptions = {}) {
  const { search, access = "all", limit = 50, offset = 0 } = options;

  if (
    (access === "trial" || access === "trial_expired") &&
    !learnerPaywallEnabled()
  ) {
    return { users: [], total: 0 };
  }

  // "subscribed" can filter in SQL via subscription_status alone (works even when
  // learning_access migration hasn't been applied). Other tiers need in-memory
  // resolveAccessTier, so fetch the full matching set first, then paginate.
  const filterInMemory = access !== "all" && access !== "subscribed";

  let query = supabase
    .from("users")
    .select("*", { count: filterInMemory ? undefined : "exact" })
    .order("created_at", { ascending: false });

  if (search?.trim()) {
    const term = search.trim().replace(/[%_]/g, "");
    query = query.or(`email.ilike.%${term}%,display_name.ilike.%${term}%`);
  }

  if (access === "subscribed") {
    query = query.in("subscription_status", [...ACTIVE_SUBSCRIPTION_STATUSES]);
  }

  if (!filterInMemory) {
    query = query.range(offset, offset + limit - 1);
  }

  const { data, count, error } = await query;
  if (error) throw error;

  const rows = data ?? [];
  const counts = await activityCountsForUsers(rows.map((r) => r.id));

  let users = rows.map((r) =>
    mapRow(r as Record<string, unknown>, counts.get(r.id) ?? { quests: 0, quizzes: 0, fullSats: 0 })
  );

  if (filterInMemory) {
    users = users.filter((u) => u.accessTier === access);
    const total = users.length;
    users = users.slice(offset, offset + limit);
    return { users, total };
  }

  return { users, total: count ?? users.length };
}

export async function getAdminUserById(userId: string): Promise<AdminUserRow | null> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const counts = await activityCountsForUsers([userId]);
  return mapRow(data as Record<string, unknown>, counts.get(userId) ?? { quests: 0, quizzes: 0, fullSats: 0 });
}

export type AdminOverview = {
  totalUsers: number;
  withAccess: number;
  subscribed: number;
  onTrial: number;
  trialExpired: number;
  homeworkOnly: number;
  onboardingIncomplete: number;
  questsCompletedToday: number;
  signupsLast7Days: number;
  learnerPaywallOn: boolean;
  educatorPaywallOn: boolean;
};

export async function getAdminOverview(): Promise<AdminOverview> {
  const today = new Date().toISOString().split("T")[0];
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString();

  const [usersRes, questsTodayRes, signupsWeekRes] = await Promise.all([
    supabase.from("users").select("*"),
    supabase
      .from("daily_quests")
      .select("id", { count: "exact", head: true })
      .eq("quest_date", today)
      .eq("status", "completed"),
    supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .gte("created_at", weekAgoStr),
  ]);

  const allUsers = usersRes.data ?? [];
  let withAccess = 0;
  let subscribed = 0;
  let onTrial = 0;
  let trialExpired = 0;
  let homeworkOnly = 0;
  let onboardingIncomplete = 0;

  for (const row of allUsers) {
    const trialEndsAt = row.trial_ends_at ? new Date(row.trial_ends_at) : null;
    const learningAccess = row.learning_access as boolean | null;
    const subscriptionStatus = row.subscription_status as string | null;

    if (hasLearningAccess({ learningAccess, trialEndsAt })) withAccess++;

    const tier = resolveAccessTier({ learningAccess, trialEndsAt, subscriptionStatus });
    if (tier === "subscribed") subscribed++;
    else if (tier === "trial") onTrial++;
    else if (tier === "trial_expired") trialExpired++;
    else if (tier === "homework_only") homeworkOnly++;

    if (!row.onboarding_completed) onboardingIncomplete++;
  }

  return {
    totalUsers: allUsers.length,
    withAccess,
    subscribed,
    onTrial,
    trialExpired,
    homeworkOnly,
    onboardingIncomplete,
    questsCompletedToday: questsTodayRes.count ?? 0,
    signupsLast7Days: signupsWeekRes.count ?? 0,
    learnerPaywallOn: learnerPaywallEnabled(),
    educatorPaywallOn: educatorPaywallEnabled(),
  };
}

export async function adminUpdateUser(
  userId: string,
  patch: {
    learningAccess?: boolean | null;
    trialEndsAt?: string | null;
    onboardingCompleted?: boolean;
    displayName?: string;
    role?: AppRole;
  }
) {
  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (patch.learningAccess !== undefined) update.learning_access = patch.learningAccess;
  if (patch.trialEndsAt !== undefined) update.trial_ends_at = patch.trialEndsAt;
  if (patch.onboardingCompleted !== undefined) {
    update.onboarding_completed = patch.onboardingCompleted;
  }
  if (patch.displayName !== undefined) update.display_name = patch.displayName;
  if (patch.role !== undefined) update.role = patch.role;

  const { data, error } = await supabase
    .from("users")
    .update(update)
    .eq("id", userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
