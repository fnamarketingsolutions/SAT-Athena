"use client";

import Link from "next/link";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

type WeekDay = {
  date: string;
  day: string;
  completed: boolean;
  isToday: boolean;
};

export function ConsistencyPanel({
  questStreak,
  bestStreak,
  weekQuestDays,
  questsCompletedThisWeek,
}: {
  questStreak: number;
  bestStreak: number;
  weekQuestDays: WeekDay[];
  questsCompletedThisWeek: number;
}) {
  return (
    <div className="border bg-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Consistency
        </h2>
        <Link href="/quest" className="text-xs font-medium text-primary hover:underline">
          Today&apos;s quest
        </Link>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Flame className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="text-3xl font-bold tabular-nums">{questStreak}</p>
          <p className="text-xs text-muted-foreground">
            day streak · best {bestStreak}
          </p>
        </div>
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
        {questsCompletedThisWeek}/7 quests completed this week
      </p>
    </div>
  );
}
