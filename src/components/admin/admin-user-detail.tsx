"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, ExternalLink, RefreshCw } from "lucide-react";
import type { AdminUserRow } from "@/lib/db/queries/admin-users";
import {
  AccessBadge,
  formatAdminDate,
  stripeDashboardUrl,
} from "@/components/admin/admin-shared";
import { APP_ROLES, APP_ROLE_LABELS, type AppRole } from "@/lib/auth/roles";

export function AdminUserDetailPage({ userId }: { userId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery<{ user: AdminUserRow }>({
    queryKey: ["admin-user", userId],
    queryFn: () =>
      fetch(`/api/admin/users/${userId}`).then((r) => {
        if (!r.ok) throw new Error("Failed");
        return r.json();
      }),
  });

  const patch = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(new Error(e.error ?? "Failed")));
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-user", userId] });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      toast.success("User updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="h-8 w-48 bg-card animate-pulse rounded mb-6" />
        <div className="h-64 bg-card animate-pulse rounded-xl border border-border" />
      </div>
    );
  }

  if (isError || !data?.user) {
    return (
      <div className="p-8">
        <p className="text-red-400">User not found.</p>
        <Link href="/studio/admin/users" className="text-primary text-sm mt-4 inline-block">
          ← Back to users
        </Link>
      </div>
    );
  }

  const u = data.user;
  const stripeUrl = stripeDashboardUrl(u.stripeCustomerId);

  return (
    <div className="p-8 max-w-3xl">
      <button
        type="button"
        onClick={() => router.push("/studio/admin/users")}
        className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        All users
      </button>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {u.displayName || u.email}
          </h1>
          <p className="text-sm text-muted-foreground">{u.email}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <AccessBadge tier={u.accessTier} />
            <span className="text-xs text-muted-foreground/70">
              Joined {formatAdminDate(u.createdAt)}
            </span>
          </div>
        </div>
      </div>

      <section className="mb-8 rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4">Subscription & access</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mb-6">
          <div>
            <dt className="text-muted-foreground/70 text-xs uppercase tracking-wider">Has app access</dt>
            <dd className="text-foreground mt-1">{u.hasAccess ? "Yes" : "No"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground/70 text-xs uppercase tracking-wider">learning_access</dt>
            <dd className="text-foreground mt-1 font-mono text-xs">
              {u.learningAccess === null ? "null (trial path)" : String(u.learningAccess)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground/70 text-xs uppercase tracking-wider">Subscription status</dt>
            <dd className="text-foreground mt-1">{u.subscriptionStatus ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground/70 text-xs uppercase tracking-wider">Trial ends</dt>
            <dd className="text-foreground mt-1">{formatAdminDate(u.trialEndsAt)}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground/70 text-xs uppercase tracking-wider">Stripe customer</dt>
            <dd className="text-foreground mt-1 font-mono text-xs break-all">
              {u.stripeCustomerId ?? "—"}
              {stripeUrl && (
                <a
                  href={stripeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 inline-flex items-center gap-1 text-primary hover:underline"
                >
                  Open in Stripe
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </dd>
          </div>
        </dl>

        <div className="flex flex-wrap gap-2">
          <ActionButton
            label="Sync from Stripe"
            loading={patch.isPending}
            onClick={() => patch.mutate({ action: "sync_stripe" })}
            icon={<RefreshCw className="h-3.5 w-3.5" />}
          />
          <ActionButton
            label="Grant full access"
            loading={patch.isPending}
            onClick={() => patch.mutate({ action: "grant_access" })}
          />
          <ActionButton
            label="Revoke access"
            loading={patch.isPending}
            variant="danger"
            onClick={() => {
              if (confirm("Revoke learning access for this user?")) {
                patch.mutate({ action: "revoke_access" });
              }
            }}
          />
          <ActionButton
            label="Extend trial 14 days"
            loading={patch.isPending}
            onClick={() => patch.mutate({ action: "extend_trial_14d" })}
          />
        </div>
      </section>

      <section className="mb-8 rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4">Role</h2>
        <p className="text-xs text-muted-foreground mb-3">
          Controls platform permissions. Admins can access this dashboard; educators use the teacher portal.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <select
            key={u.role}
            value={u.role}
            disabled={patch.isPending}
            onChange={(e) => {
              const next = e.target.value as AppRole;
              if (next === u.role) return;
              if (
                next !== "admin" &&
                !confirm(`Change role to ${APP_ROLE_LABELS[next]}?`)
              ) {
                return;
              }
              patch.mutate({ role: next });
            }}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
          >
            {APP_ROLES.map((r) => (
              <option key={r} value={r}>
                {APP_ROLE_LABELS[r]}
              </option>
            ))}
          </select>
          <span className="text-xs text-muted-foreground/70">Current: {APP_ROLE_LABELS[u.role]}</span>
        </div>
      </section>

      <section className="mb-8 rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4">Learning profile</h2>
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <Stat label="Composite" value={u.currentComposite ?? "—"} />
          <Stat label="Target" value={u.targetScore ?? "—"} />
          <Stat label="Best streak" value={u.bestStreak} />
          <Stat label="Total XP" value={u.totalXp} />
          <Stat label="Onboarding" value={u.onboardingCompleted ? "Complete" : "Incomplete"} />
        </dl>
        <div className="mt-4">
          <ActionButton
            label={u.onboardingCompleted ? "Mark onboarding incomplete" : "Mark onboarding complete"}
            loading={patch.isPending}
            onClick={() =>
              patch.mutate({ onboardingCompleted: !u.onboardingCompleted })
            }
          />
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4">Engagement</h2>
        <dl className="grid grid-cols-3 gap-4 text-sm">
          <Stat label="Quests done" value={u.questsCompleted} />
          <Stat label="Quiz sessions" value={u.quizSessions} />
          <Stat label="Full SATs" value={u.fullSatsCompleted} />
        </dl>
      </section>

      <p className="mt-6 text-xs text-muted-foreground/70 font-mono">id: {u.id}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-muted-foreground/70 text-xs">{label}</dt>
      <dd className="text-foreground font-semibold tabular-nums mt-0.5">{value}</dd>
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  loading,
  variant = "default",
  icon,
}: {
  label: string;
  onClick: () => void;
  loading?: boolean;
  variant?: "default" | "danger";
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={loading}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
        variant === "danger"
          ? "border border-red-500/40 text-red-400 hover:bg-red-500/10"
          : "border border-border text-foreground hover:bg-secondary"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
