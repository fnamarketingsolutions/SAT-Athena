"use client";

import { motion } from "framer-motion";

export function OverallAccuracy({
  accuracy,
  targetPercent,
}: {
  accuracy: number;
  targetPercent: number;
}) {
  const pointsToTarget = Math.max(targetPercent - accuracy, 0);
  const pct = Math.min(accuracy, 100);

  return (
    <div className="border bg-card p-6">
      <div className="flex items-baseline justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Overall Accuracy
          </p>
          <span className="text-5xl font-bold tabular-nums tracking-tight">
            {accuracy}%
          </span>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Pass Target
          </p>
          <span className="text-3xl font-bold tabular-nums tracking-tight">
            {targetPercent}%
          </span>
        </div>
      </div>

      <div className="relative mt-4">
        <div className="h-3 w-full overflow-hidden bg-muted">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>
        <div
          className="absolute top-0 h-3 w-0.5 bg-foreground/40"
          style={{ left: `${targetPercent}%` }}
        />
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        {pointsToTarget > 0
          ? `${pointsToTarget}% to pass target`
          : "Pass target reached!"}{" "}
        &middot; Bar exam benchmark ~{targetPercent}%
      </p>
    </div>
  );
}
