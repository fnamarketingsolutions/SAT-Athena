"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import type { AccessTier, AdminUserRow } from "@/lib/db/queries/admin-users";
import { APP_ROLE_LABELS } from "@/lib/auth/roles";
import { AccessBadge, formatAdminDate } from "@/components/admin/admin-shared";

const FILTERS: { value: AccessTier | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "subscribed", label: "Subscribed" },
  { value: "trial", label: "Trial" },
  { value: "trial_expired", label: "Trial expired" },
  { value: "comped", label: "Comped" },
  { value: "homework_only", label: "Homework" },
  { value: "grandfathered", label: "Grandfathered" },
];

export function AdminUsersPage({
  defaultAccess = "all",
  title = "Users",
  subtitle = "Search learners, view access tier, and open user detail for subscription actions.",
}: {
  defaultAccess?: AccessTier | "all";
  title?: string;
  subtitle?: string;
}) {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [debounced, setDebounced] = useState(search);
  const [access, setAccess] = useState<AccessTier | "all">(
    (searchParams.get("access") as AccessTier) ?? defaultAccess
  );

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, isError } = useQuery<{ users: AdminUserRow[]; total: number }>({
    queryKey: ["admin-users", debounced, access],
    queryFn: () => {
      const params = new URLSearchParams();
      if (debounced) params.set("search", debounced);
      if (access !== "all") params.set("access", access);
      return fetch(`/api/admin/users?${params}`).then((r) => {
        if (!r.ok) throw new Error("Failed");
        return r.json();
      });
    },
    staleTime: 15_000,
  });

  return (
    <div className="p-8 max-w-6xl">
      <h1 className="text-2xl font-bold text-foreground mb-1">{title}</h1>
      <p className="text-sm text-muted-foreground mb-6">{subtitle}</p>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search email or name…"
            className="w-full rounded-lg border border-border bg-background py-2 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-ring focus:outline-none"
          />
        </div>
        <select
          value={access}
          onChange={(e) => setAccess(e.target.value as AccessTier | "all")}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
        >
          {FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 rounded-lg bg-card animate-pulse border border-border" />
          ))}
        </div>
      )}

      {isError && <p className="text-red-400">Failed to load users.</p>}

      {data && (
        <>
          <p className="text-xs text-muted-foreground/70 mb-3">{data.total} users</p>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-card text-left text-[10px] uppercase tracking-wider text-muted-foreground/70">
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Access</th>
                  <th className="px-4 py-3">Subscription</th>
                  <th className="px-4 py-3">Onboarding</th>
                  <th className="px-4 py-3">Activity</th>
                  <th className="px-4 py-3">Joined</th>
                </tr>
              </thead>
              <tbody>
                {data.users.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-border hover:bg-card/60"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/studio/admin/users/${u.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {u.displayName || u.email}
                      </Link>
                      <p className="text-xs text-muted-foreground/70">{u.email}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {APP_ROLE_LABELS[u.role]}
                    </td>
                    <td className="px-4 py-3">
                      <AccessBadge tier={u.accessTier} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {u.subscriptionStatus ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {u.onboardingCompleted ? "Done" : "Pending"}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">
                      {u.questsCompleted}q · {u.quizSessions}quiz · {u.fullSatsCompleted}sat
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {formatAdminDate(u.createdAt)}
                    </td>
                  </tr>
                ))}
                {data.users.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground/70">
                      No users match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
