"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

type Overview = {
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

function StatCard({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: number | string;
  hint?: string;
  href?: string;
}) {
  const inner = (
    <div className="rounded-xl border border-border bg-card p-5 transition hover:border-primary/40">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold tabular-nums text-foreground">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

export function AdminOverviewPage() {
  const { data, isLoading, isError } = useQuery<Overview>({
    queryKey: ["admin-overview"],
    queryFn: () =>
      fetch("/api/admin/overview").then((r) => {
        if (!r.ok) throw new Error("Failed to load");
        return r.json();
      }),
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-28 rounded-xl bg-card animate-pulse border border-border" />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return <div className="p-8 text-red-400">Failed to load admin overview.</div>;
  }

  return (
    <div className="p-8 max-w-6xl">
      <h1 className="text-2xl font-bold text-foreground mb-1">Platform overview</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Users, subscriptions, and engagement at a glance.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        <StatCard label="Total users" value={data.totalUsers} href="/studio/admin/users" />
        <StatCard label="Active access" value={data.withAccess} hint="Can use learning app" />
        <StatCard
          label="Paid subscribers"
          value={data.subscribed}
          href="/studio/admin/subscriptions?access=subscribed"
        />
        <StatCard label="On free trial" value={data.onTrial} />
        <StatCard
          label="Trial expired"
          value={data.trialExpired}
          href="/studio/admin/subscriptions?access=trial_expired"
        />
        <StatCard label="Homework-only" value={data.homeworkOnly} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        <StatCard label="Quests completed today" value={data.questsCompletedToday} />
        <StatCard label="Signups (7 days)" value={data.signupsLast7Days} />
        <StatCard label="Onboarding incomplete" value={data.onboardingIncomplete} />
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground mb-3">Environment flags</h2>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>
            Learner paywall (LEARNER_PAYWALL):{" "}
            <span className={data.learnerPaywallOn ? "text-amber-400" : "text-muted-foreground/70"}>
              {data.learnerPaywallOn ? "ON" : "off"}
            </span>
          </li>
          <li>
            Educator paywall (EDUCATOR_PAYWALL):{" "}
            <span className={data.educatorPaywallOn ? "text-amber-400" : "text-muted-foreground/70"}>
              {data.educatorPaywallOn ? "ON" : "off"}
            </span>
          </li>
        </ul>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/studio/admin/users"
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
        >
          Manage users
        </Link>
        <Link
          href="/studio/admin/subscriptions"
          className="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-card"
        >
          Subscription management
        </Link>
      </div>
    </div>
  );
}
