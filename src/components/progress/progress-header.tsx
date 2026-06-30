"use client";

import { AnimatedSprite } from "@/components/pixel-art/animated-sprite";

export function ProgressHeader({
  eyebrow = "Progress",
  title = "Your Progress",
  subtitle = "Across your subjects",
}: {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-center gap-4">
      <AnimatedSprite
        src="/images/pixel-art/profile-avatar.png"
        alt="Avatar"
        width={64}
        height={64}
      />
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {eyebrow}
        </p>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}
