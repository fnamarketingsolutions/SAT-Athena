import { Suspense } from "react";
import { AdminUsersPage } from "@/components/admin/admin-users-list";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8 text-muted-foreground">Loading users…</div>}>
      <AdminUsersPage />
    </Suspense>
  );
}
