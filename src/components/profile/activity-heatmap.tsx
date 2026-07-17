"use client";

import { cn } from "@/lib/utils";

export type HeatmapDay = {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
};

const LEVEL_CLASS: Record<HeatmapDay["level"], string> = {
  0: "bg-muted",
  1: "bg-primary/25",
  2: "bg-primary/45",
  3: "bg-primary/70",
  4: "bg-primary",
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function ActivityHeatmap({
  days,
  weeks = 12,
}: {
  days: HeatmapDay[];
  weeks?: number;
}) {
  // Build columns (oldest → newest week), each with 7 cells Sun→Sat
  const byDate = new Map(days.map((d) => [d.date, d]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const end = new Date(today);
  // Align end week to Saturday of current week for a full column
  const endDow = end.getDay();
  const start = new Date(end);
  start.setDate(end.getDate() - endDow - (weeks - 1) * 7);

  const columns: HeatmapDay[][] = [];
  for (let w = 0; w < weeks; w++) {
    const col: HeatmapDay[] = [];
    for (let dow = 0; dow < 7; dow++) {
      const d = new Date(start);
      d.setDate(start.getDate() + w * 7 + dow);
      const iso = d.toISOString().split("T")[0];
      const found = byDate.get(iso);
      col.push(
        found ?? {
          date: iso,
          count: 0,
          level: 0,
        }
      );
    }
    columns.push(col);
  }

  const activeDays = days.filter((d) => d.count > 0).length;

  return (
    <div className="border border-border bg-card p-5">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Study activity
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Consistency and intensity over the last {weeks} weeks
          </p>
        </div>
        <p className="shrink-0 text-xs text-muted-foreground">
          {activeDays} active day{activeDays === 1 ? "" : "s"}
        </p>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-flex gap-3">
          <div className="flex flex-col justify-between py-0.5 pr-1 text-[10px] text-muted-foreground">
            {WEEKDAYS.map((d, i) => (
              <span
                key={d}
                className={cn("h-3 leading-3", i % 2 === 1 ? "opacity-100" : "opacity-0")}
              >
                {d}
              </span>
            ))}
          </div>
          <div className="flex gap-1">
            {columns.map((col, wi) => (
              <div key={wi} className="flex flex-col gap-1">
                {col.map((cell) => (
                  <div
                    key={cell.date}
                    title={`${cell.date}: ${cell.count} session${cell.count === 1 ? "" : "s"}`}
                    className={cn(
                      "h-3 w-3 rounded-sm",
                      LEVEL_CLASS[cell.level]
                    )}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end gap-1.5 text-[10px] text-muted-foreground">
        <span>Less</span>
        {([0, 1, 2, 3, 4] as const).map((lvl) => (
          <span key={lvl} className={cn("h-3 w-3 rounded-sm", LEVEL_CLASS[lvl])} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
