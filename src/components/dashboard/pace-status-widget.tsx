"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Gauge } from "lucide-react";
import {
  formatAveragePace,
  PACE_PRACTICE_HREF,
  PACE_SECONDS_PER_QUESTION,
  type PaceStatus,
} from "@/lib/pacing";
import { cn } from "@/lib/utils";

type PaceSummaryResponse = {
  status: PaceStatus | null;
  avgSecondsPerQuestion: number | null;
  sessionCount: number;
};

export function PaceStatusWidget() {
  const { data, isLoading } = useQuery<PaceSummaryResponse>({
    queryKey: ["pacing-summary"],
    queryFn: async () => {
      const res = await fetch("/api/pacing/summary");
      if (!res.ok) throw new Error("Failed to load pacing");
      return res.json();
    },
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="mb-10 h-36 w-full max-w-xl animate-pulse rounded-2xl border border-border bg-card" />
    );
  }

  if (!data || data.sessionCount === 0 || data.status == null) {
    return null;
  }

  const good = data.status === "good";
  const avgLabel =
    data.avgSecondsPerQuestion != null
      ? formatAveragePace(data.avgSecondsPerQuestion)
      : null;

  return (
    <div
      className={cn(
        "mb-10 w-full max-w-xl rounded-2xl border p-6 text-left shadow-sm",
        good
          ? "border-emerald-500/40 bg-emerald-500/10"
          : "border-red-500/50 bg-red-500/15"
      )}
    >
      <div className="flex items-start gap-3">
        <Gauge
          className={cn(
            "mt-0.5 h-6 w-6 shrink-0",
            good
              ? "text-emerald-700 dark:text-emerald-400"
              : "text-red-600 dark:text-red-400"
          )}
        />
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "font-medium",
              good
                ? "text-emerald-900 dark:text-emerald-200"
                : "text-red-900 dark:text-red-200"
            )}
          >
            {good
              ? "Your recent pace looks great! Keep up the speed."
              : "Your recent pace is too slow. You risk running out of time on the real exam."}
          </p>
          <p
            className={cn(
              "mt-1 text-sm",
              good
                ? "text-emerald-800/80 dark:text-emerald-300/80"
                : "text-red-800/80 dark:text-red-300/80"
            )}
          >
            Last {data.sessionCount} session
            {data.sessionCount === 1 ? "" : "s"}
            {avgLabel ? ` · avg ${avgLabel}` : ""}
            {" · "}
            target {Math.floor(PACE_SECONDS_PER_QUESTION / 60)}:
            {(PACE_SECONDS_PER_QUESTION % 60).toString().padStart(2, "0")} / q
          </p>
          <Link
            href={PACE_PRACTICE_HREF}
            className={cn(
              "mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition",
              good
                ? "bg-emerald-700 text-white hover:bg-emerald-700/90 dark:bg-emerald-500 dark:text-emerald-950"
                : "bg-red-600 text-white hover:bg-red-600/90 dark:bg-red-500"
            )}
          >
            Practice with Pacing Monitor
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
