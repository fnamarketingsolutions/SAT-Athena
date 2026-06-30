import { Suspense } from "react";
import { AdminUsersPage } from "@/components/admin/admin-users-list";
import type { AccessTier } from "@/lib/db/queries/admin-users";

type Props = { searchParams: Promise<{ access?: string }> };

export default async function Page({ searchParams }: Props) {
  const params = await searchParams;
  const access = (params.access as AccessTier) ?? "subscribed";

  return (
    <Suspense fallback={<div className="p-8 text-muted-foreground">Loading…</div>}>
      <AdminUsersPage
        defaultAccess={access}
        title="Subscriptions"
        subtitle="Filter by billing status, sync from Stripe, and manage learning access per user."
      />
    </Suspense>
  );
}
