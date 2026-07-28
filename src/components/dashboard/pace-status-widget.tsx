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

export function PaceStatusWidget({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const { data, isLoading } = useQuery<PaceSummaryResponse>({
    queryKey: ["pacing-summary"],
    queryFn: async () => {
      const res = await fetch("/api/pacing/summary");
      if (!res.ok) throw new Error("Failed to load pacing");
      return res.json();
    },
    staleTime: 60_000,
  });

  const wrap = (node: React.ReactNode) => (
    <div className={cn(!embedded && "mb-10 w-full max-w-xl")}>{node}</div>
  );

  if (isLoading) {
    return wrap(
      <div className="h-36 animate-pulse rounded-2xl border border-border bg-card" />
    );
  }

  if (!data || data.sessionCount === 0 || data.status == null) {
    if (!embedded) return null;
    return wrap(
      <div className="rounded-2xl border border-dashed border-border bg-card/60 p-5 text-left">
        <div className="flex items-start gap-3">
          <Gauge className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium text-foreground">Pacing monitor</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Complete a practice session to see your average time per question.
            </p>
            <Link
              href={PACE_PRACTICE_HREF}
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Practice with pacing
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const good = data.status === "good";
  const avgLabel =
    data.avgSecondsPerQuestion != null
      ? formatAveragePace(data.avgSecondsPerQuestion)
      : null;

  return wrap(
    <div
      className={cn(
        "rounded-2xl border p-5 text-left shadow-sm",
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
