"use client";

import { cn } from "@/lib/utils";

type StudyDay = {
  day: string;
  completed: boolean;
  isPast: boolean;
  isToday?: boolean;
};

/** Weekly study consistency — no streak counters or gamification. */
export function QuestStreak({ days }: { days: StudyDay[]; streak?: number }) {
  const completedCount = days.filter((d) => d.completed).length;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          This week
        </h3>
        <span className="text-xs text-muted-foreground">
          {completedCount}/{days.length} days
        </span>
      </div>
      <div className="flex justify-between gap-1">
        {days.map((d, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold",
                d.completed
                  ? "bg-primary text-primary-foreground"
                  : d.isToday
                    ? "border-2 border-primary text-primary"
                    : "bg-muted text-muted-foreground"
              )}
            >
              {d.day.slice(0, 1)}
            </div>
            <span className="text-[10px] text-muted-foreground">{d.day}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
