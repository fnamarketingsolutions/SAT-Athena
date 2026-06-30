/** App-level authorization roles stored on public.users.role */
export type AppRole = "learner" | "educator" | "admin";

export const APP_ROLES: AppRole[] = ["learner", "educator", "admin"];

export const APP_ROLE_LABELS: Record<AppRole, string> = {
  learner: "Learner",
  educator: "Educator",
  admin: "Platform admin",
};

export function isAppRole(value: string): value is AppRole {
  return APP_ROLES.includes(value as AppRole);
}
