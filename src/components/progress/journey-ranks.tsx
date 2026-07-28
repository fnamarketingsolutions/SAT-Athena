"use client";

import { cn } from "@/lib/utils";

type Rank = {
  name: string;
  threshold: number;
  emoji: string;
};

export function JourneyRanks({
  currentScore,
  ranks,
  unit = "",
}: {
  currentScore: number;
  ranks: readonly Rank[];
  unit?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h2 className="mb-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        Journey
      </h2>
      <div className="space-y-0">
        {ranks.map((rank) => {
          const unlocked = currentScore >= rank.threshold;
          return (
            <div
              key={rank.name}
              className={cn(
                "flex items-center justify-between border-b border-border/40 py-3 last:border-0 transition-opacity",
                unlocked ? "opacity-100" : "opacity-40"
              )}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{rank.emoji}</span>
                <span
                  className={cn(
                    "text-sm font-bold",
                    unlocked ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {rank.name}
                </span>
              </div>
              <span
                className={cn(
                  "text-sm tabular-nums",
                  unlocked
                    ? "text-foreground font-medium"
                    : "text-muted-foreground"
                )}
              >
                {rank.threshold}
                {unit}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
