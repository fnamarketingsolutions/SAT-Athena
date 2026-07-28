"use client";

import {
  averageSecondsPerQuestion,
  formatHistoryPace,
  getPaceStatus,
} from "@/lib/pacing";
import { cn } from "@/lib/utils";

export type RecentResultSession = {
  id: string;
  quizName: string;
  score: number;
  totalQuestions: number;
  timeElapsedSeconds: number;
  date: string;
  /** Questions with an actively selected answer (excludes skips). */
  answeredCount?: number;
  /** Precomputed avg seconds/q when available (e.g. mocks with answered count). */
  avgSecondsPerQuestion?: number | null;
};

export function PracticeTestResults({
  sessions,
}: {
  sessions: RecentResultSession[];
}) {
  if (sessions.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Recent Results
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          No practice sessions yet.
        </p>
      </div>
    );
  }

  const displayed = sessions.slice(0, 10);

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h2 className="mb-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        Recent Results
      </h2>
      <div className="space-y-0">
        {displayed.map((session) => {
          const date = new Date(session.date);
          const dateStr = date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          });
          const pct =
            session.totalQuestions > 0
              ? Math.round((session.score / session.totalQuestions) * 100)
              : 0;

          const avg =
            session.avgSecondsPerQuestion ??
            averageSecondsPerQuestion(
              session.timeElapsedSeconds,
              session.answeredCount ?? 0
            );
          const paceStatus = avg != null ? getPaceStatus(avg) : null;

          return (
            <div
              key={session.id}
              className="flex items-center justify-between gap-4 border-b border-border/40 py-3.5 last:border-0"
            >
              <div className="min-w-0">
                <p className="text-sm font-bold">{session.quizName}</p>
                <p className="text-xs text-muted-foreground">{dateStr}</p>
                {avg != null && paceStatus && (
                  <p
                    className={cn(
                      "mt-1 text-sm font-semibold tabular-nums",
                      paceStatus === "good"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400"
                    )}
                  >
                    {formatHistoryPace(avg)}
                  </p>
                )}
              </div>
              <div className="shrink-0 text-right">
                <span className="text-2xl font-bold tabular-nums">
                  {session.score}/{session.totalQuestions}
                </span>
                <p className="text-xs text-muted-foreground">{pct}%</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
