"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { cn } from "@/lib/utils";

function useHideAppChrome(pathname: string) {
  return pathname.startsWith("/studio/admin");
}

type AppShellProps = {
  children: React.ReactNode;
  /** Header-only, no sidebar (onboarding wizard) */
  minimal?: boolean;
};

export function AppShell({ children, minimal = false }: AppShellProps) {
  const pathname = usePathname();
  const hideChrome = useHideAppChrome(pathname);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (hideChrome) {
    return <>{children}</>;
  }

  if (minimal) {
    return (
      <div className="min-h-screen">
        <AppHeader minimal />
        <main>{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <AppHeader onMenuClick={() => setSidebarOpen(true)} />
      <div className={cn("min-h-screen md:pl-[15rem]")}>{children}</div>
    </div>
  );
}
