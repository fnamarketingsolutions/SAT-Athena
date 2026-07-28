"use client";

import { cn } from "@/lib/utils";

type SubjectScore = {
  subject: string;
  label: string;
  shortLabel: string;
  total: number;
  correct: number;
  accuracy: number;
};

/** Progress by MBE topic — priority attention for weaker subjects. */
export function TopicProgressPanel({
  subjects,
  targetPercent = 65,
}: {
  subjects: SubjectScore[];
  targetPercent?: number;
}) {
  if (subjects.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Progress by exam topic
        </h3>
        <p className="mt-3 text-sm text-muted-foreground">
          Complete practice across MBE subjects to see where to focus next.
        </p>
      </div>
    );
  }

  const sorted = [...subjects].sort((a, b) => {
    // Prioritize attempted subjects by accuracy ascending (needs attention first)
    if (a.total === 0 && b.total === 0) return a.label.localeCompare(b.label);
    if (a.total === 0) return 1;
    if (b.total === 0) return -1;
    return a.accuracy - b.accuracy;
  });

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Progress by exam topic
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Subjects sorted by priority — lowest accuracy first
      </p>
      <div className="mt-4 space-y-3">
        {sorted.map((s) => {
          const needsFocus =
            s.total > 0 && s.accuracy < targetPercent;
          return (
            <div key={s.subject}>
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-foreground">
                  {s.label}
                </span>
                <span
                  className={cn(
                    "text-sm tabular-nums",
                    s.total === 0
                      ? "text-muted-foreground"
                      : needsFocus
                        ? "font-semibold text-foreground"
                        : "text-muted-foreground"
                  )}
                >
                  {s.total === 0 ? "—" : `${s.accuracy}%`}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    s.total === 0
                      ? "bg-transparent"
                      : needsFocus
                        ? "bg-primary/70"
                        : "bg-accent"
                  )}
                  style={{
                    width: `${s.total === 0 ? 0 : Math.min(100, s.accuracy)}%`,
                  }}
                />
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {s.total === 0
                  ? "Not started"
                  : `${s.correct}/${s.total} correct${
                      needsFocus ? " · prioritize" : ""
                    }`}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
