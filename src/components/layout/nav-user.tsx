"use client";

import { AuthUserButton } from "@/components/auth/components";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

export function NavUser({ immersive = false }: { immersive?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2", immersive && "text-white")}>
      <ThemeToggle />
      <AuthUserButton />
    </div>
  );
}
