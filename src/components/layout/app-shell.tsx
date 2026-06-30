"use client";

import { usePathname } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { cn } from "@/lib/utils";

function useHideAppChrome(pathname: string) {
  return pathname.startsWith("/studio/admin");
}

function useImmersiveTopPadding(pathname: string) {
  return (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/onboarding")
    // /mentor uses a fixed full-bleed shell below the header — no pt-14.
  );
}

type AppShellProps = {
  children: React.ReactNode;
  /** Header only — no nav links (onboarding wizard) */
  minimal?: boolean;
};

export function AppShell({ children, minimal = false }: AppShellProps) {
  const pathname = usePathname();
  const hideChrome = useHideAppChrome(pathname);
  const immersivePad = useImmersiveTopPadding(pathname);

  if (hideChrome) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen">
      <AppHeader minimal={minimal} />
      <div
        className={cn(
          "min-h-[calc(100vh-3.5rem)]",
          immersivePad && "pt-14"
        )}
      >
        {children}
      </div>
    </div>
  );
}
