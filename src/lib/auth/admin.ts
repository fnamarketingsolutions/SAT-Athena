import "server-only";

import type { AppRole } from "@/lib/auth/roles";

/** Optional bootstrap: emails in ATHENA_ADMIN_EMAILS get role=admin on sync until
 *  an admin is promoted via the database or admin UI. */
export function getBootstrapAdminEmails(): string[] {
  const raw = process.env.ATHENA_ADMIN_EMAILS ?? "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isBootstrapAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getBootstrapAdminEmails().includes(email.trim().toLowerCase());
}

/** Platform admin check — database role is the source of truth. */
export function isAthenaAdmin(user: { role: AppRole }): boolean {
  return user.role === "admin";
}

export function isEducator(user: { role: AppRole }): boolean {
  return user.role === "educator" || user.role === "admin";
}
