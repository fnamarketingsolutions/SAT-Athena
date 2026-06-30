import type { AccessTier } from "@/lib/db/queries/admin-users";

export const ACCESS_TIER_LABELS: Record<AccessTier, string> = {
  subscribed: "Subscribed",
  comped: "Comped / granted",
  trial: "Free trial",
  trial_expired: "Trial expired",
  homework_only: "Homework only",
  grandfathered: "Grandfathered",
};

export const ACCESS_TIER_STYLES: Record<AccessTier, string> = {
  subscribed: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  comped: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
  trial: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  trial_expired: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30",
  homework_only: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30",
  grandfathered: "bg-muted text-muted-foreground border-border",
};

export function AccessBadge({ tier }: { tier: AccessTier }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${ACCESS_TIER_STYLES[tier]}`}
    >
      {ACCESS_TIER_LABELS[tier]}
    </span>
  );
}

export function formatAdminDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function stripeDashboardUrl(customerId: string | null) {
  if (!customerId) return null;
  return `https://dashboard.stripe.com/test/customers/${customerId}`;
}
