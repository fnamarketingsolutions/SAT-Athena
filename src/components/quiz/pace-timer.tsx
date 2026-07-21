"use client";

import { cn } from "@/lib/utils";
import type { PaceZone } from "@/lib/pacing";

type PaceTimerProps = {
  display: string;
  zone: PaceZone;
  isOvertime?: boolean;
  className?: string;
};

const zoneStyles: Record<PaceZone, string> = {
  safe: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  warn: "border-orange-500/45 bg-orange-500/10 text-orange-700 dark:text-orange-400",
  alert:
    "border-red-500/50 bg-red-500/15 text-red-600 dark:text-red-400 shadow-[0_0_0_1px_rgba(239,68,68,0.25)]",
};

/**
 * Compact pacing countdown shown above the question card.
 * Green → orange → red; overtime stays red and counts upward as -0:01…
 */
export function PaceTimer({
  display,
  zone,
  isOvertime = false,
  className,
}: PaceTimerProps) {
  return (
    <div
      className={cn(
        "mb-3 flex items-center justify-between gap-3 rounded-lg border px-3 py-2",
        zoneStyles[zone],
        className
      )}
      role="timer"
      aria-live="polite"
      aria-label={
        isOvertime
          ? `Over pace by ${display.replace("-", "")}`
          : `Time pace remaining ${display}`
      }
    >
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-80">
          Time Pace
        </p>
        <p className="truncate text-xs opacity-80">
          {isOvertime
            ? "Over time — pick an answer and move on"
            : zone === "alert"
              ? "Urgent — answer and continue"
              : zone === "warn"
                ? "More than half used"
                : "1:48 per question"}
        </p>
      </div>
      <span
        className={cn(
          "shrink-0 font-mono text-xl font-bold tabular-nums sm:text-2xl",
          zone === "alert" && "animate-pulse"
        )}
      >
        {display}
      </span>
    </div>
  );
}
