"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

type WeekDay = {
  date: string;
  day: string;
  completed: boolean;
  isToday: boolean;
};

export function ConsistencyPanel({
  weekQuestDays,
  questsCompletedThisWeek,
}: {
  questStreak?: number;
  bestStreak?: number;
  weekQuestDays: WeekDay[];
  questsCompletedThisWeek: number;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Study consistency
        </h2>
        <Link href="/quest" className="text-xs font-medium text-primary hover:underline">
          Today&apos;s practice
        </Link>
      </div>

      <div className="mt-5 flex justify-between gap-1">
        {weekQuestDays.map((d) => (
          <div key={d.date} className="flex flex-col items-center gap-1.5">
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

      <p className="mt-4 text-xs text-muted-foreground">
        {questsCompletedThisWeek} of 7 scheduled days completed this week
      </p>
    </div>
  );
}
