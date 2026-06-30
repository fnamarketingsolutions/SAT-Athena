import { redirect } from "next/navigation";
import { getAuthIdentity, getAppUser } from "@/lib/auth/current-user";
import { isAthenaAdmin } from "@/lib/auth/admin";
import { StudioAdminShell } from "./admin-shell";

export default async function StudioAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await getAuthIdentity();
  if (!userId) {
    redirect("/sign-in?redirect_url=%2Fstudio%2Fadmin");
  }

  const user = await getAppUser(userId);
  if (!user || !isAthenaAdmin(user)) {
    redirect("/dashboard");
  }

  return <StudioAdminShell>{children}</StudioAdminShell>;
}
