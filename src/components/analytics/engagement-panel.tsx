"use client";

import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import type { EngagementSummary } from "@/lib/db/queries/analytics";

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function EngagementPanel({
  engagement,
}: {
  engagement: EngagementSummary;
}) {
  const TrendIcon =
    engagement.improvementTrend === "improving"
      ? TrendingUp
      : engagement.improvementTrend === "declining"
        ? TrendingDown
        : Minus;

  const trendLabel =
    engagement.improvementTrend === "improving"
      ? "Improving"
      : engagement.improvementTrend === "declining"
        ? "Needs attention"
        : "Stable";

  return (
    <div className="border bg-card p-5">
      <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        Engagement
      </h2>
      <div className="mt-4 flex items-center gap-2">
        <TrendIcon className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">{trendLabel}</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-2xl font-bold tabular-nums">
            {formatDuration(engagement.totalQuizTimeSeconds)}
          </p>
          <p className="text-xs text-muted-foreground">Quiz time</p>
        </div>
        <div>
          <p className="text-2xl font-bold tabular-nums">
            {formatDuration(engagement.totalLessonTimeSeconds)}
          </p>
          <p className="text-xs text-muted-foreground">Lesson time</p>
        </div>
        <div>
          <p className="text-2xl font-bold tabular-nums">
            {engagement.microLessonCompletionRate}%
          </p>
          <p className="text-xs text-muted-foreground">Lessons finished</p>
        </div>
        <div>
          <p className="text-2xl font-bold tabular-nums">
            {engagement.avgHintsPerQuestion}
          </p>
          <p className="text-xs text-muted-foreground">Hints / question</p>
        </div>
      </div>
    </div>
  );
}
