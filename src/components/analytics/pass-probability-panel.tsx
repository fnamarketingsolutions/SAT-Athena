"use client";

import type { PassProbabilityResult } from "@/lib/pass-probability";

type PassProbabilityPanelProps = {
  data: PassProbabilityResult;
  compact?: boolean;
};

export function PassProbabilityPanel({
  data,
  compact = false,
}: PassProbabilityPanelProps) {
  return (
    <div
      className={
        compact
          ? "border border-border bg-card p-4 shadow-sm"
          : "border border-border bg-card p-6 shadow-sm"
      }
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        Pass Probability
      </p>
      <h2
        className={
          compact
            ? "mt-2 text-2xl font-bold tracking-tight text-foreground"
            : "mt-2 text-3xl font-bold tracking-tight text-foreground md:text-4xl"
        }
      >
        {data.passProbability}% Pass Probability
      </h2>
      <p className="mt-2 text-sm italic text-muted-foreground">
        {data.summarySource}
      </p>

      <div className="mt-4 border-t border-border pt-4 text-sm text-foreground">
        Your Projected MBE:{" "}
        <span className="font-semibold tabular-nums">{data.projectedMbe}</span>{" "}
        <span className="italic text-muted-foreground">({data.zone})</span>
      </div>
    </div>
  );
}
