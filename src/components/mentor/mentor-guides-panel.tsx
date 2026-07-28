"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ScheduleSlot = {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
};

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const DAY_ORDER = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

function formatTimeStr(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function buildMonthCells(view: Date): (Date | null)[] {
  const first = startOfMonth(view);
  const startPad = first.getDay();
  const daysInMonth = new Date(
    view.getFullYear(),
    view.getMonth() + 1,
    0
  ).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(new Date(view.getFullYear(), view.getMonth(), day));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/** Left column: human guide, calendar, and study slots (demo-friendly). */
export function MentorGuidesPanel() {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    return d;
  }, []);
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(today));
  const [selected, setSelected] = useState(today);

  const { data } = useQuery<{ schedules: ScheduleSlot[] }>({
    queryKey: ["profile-schedule"],
    queryFn: () =>
      fetch("/api/profile/schedule").then((r) => {
        if (!r.ok) throw new Error("Failed to load schedule");
        return r.json();
      }),
    staleTime: 60_000,
  });

  const schedules = data?.schedules ?? [];
  const activeSchedules = schedules.filter((s) => s.isActive !== false);
  const studyTime = activeSchedules[0]
    ? formatTimeStr(activeSchedules[0].startTime)
    : "7:00 AM";

  const slotRows = DAY_ORDER.map((day) => {
    const match = activeSchedules.find((s) => s.dayOfWeek === day);
    return {
      day,
      label: day.charAt(0).toUpperCase() + day.slice(1),
      time: match ? formatTimeStr(match.startTime) : null,
    };
  }).filter((row) => row.time);

  const displaySlots =
    slotRows.length > 0
      ? slotRows
      : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map(
          (label) => ({
            day: label.toLowerCase(),
            label,
            time: studyTime,
          })
        );

  const cells = buildMonthCells(viewMonth);
  const monthTitle = viewMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Your Guides
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose your path to bar exam readiness — human coaching and AI help
          in one place.
        </p>
      </div>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <UserRound className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-foreground">Human Guide</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Weekly check-ins with a bar exam coach for strategy, pacing, and
              accountability. Sessions follow your study schedule.
            </p>
            <button
              type="button"
              className="mt-3 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              onClick={() => {
                /* Demo CTA — booking flow not required for completion */
              }}
            >
              Request a session
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Study Calendar
            </h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Previous month"
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={() =>
                setViewMonth(
                  new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1)
                )
              }
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[9rem] text-center text-sm font-medium text-foreground">
              {monthTitle}
            </span>
            <button
              type="button"
              aria-label="Next month"
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={() =>
                setViewMonth(
                  new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1)
                )
              }
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {WEEKDAY_LABELS.map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {cells.map((date, i) => {
            if (!date) {
              return <div key={`empty-${i}`} className="aspect-square" />;
            }
            const isSelected = sameDay(date, selected);
            const isToday = sameDay(date, today);
            return (
              <button
                key={date.toISOString()}
                type="button"
                onClick={() => setSelected(date)}
                className={cn(
                  "aspect-square rounded-md text-sm transition-colors",
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : isToday
                      ? "bg-primary/10 font-semibold text-primary"
                      : "text-foreground hover:bg-muted"
                )}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>
      </section>

      <div className="flex items-start gap-3 rounded-2xl border border-border bg-muted/40 px-4 py-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <p className="text-sm text-muted-foreground">
          Missed a study block? Check your{" "}
          <Link href="/dashboard" className="font-medium text-primary hover:underline">
            dashboard
          </Link>{" "}
          and Daily Practice before your next session.
        </p>
      </div>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Available Slots
          </h2>
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            Study time: {studyTime}
          </span>
        </div>
        <ul className="mt-3 divide-y divide-border">
          {displaySlots.map((slot) => (
            <li
              key={slot.day}
              className="flex items-center justify-between py-2.5 text-sm"
            >
              <span className="font-medium text-foreground">{slot.label}</span>
              <span className="text-muted-foreground">{slot.time}</span>
            </li>
          ))}
        </ul>
        <Link
          href="/profile"
          className="mt-3 inline-block text-xs font-medium text-primary hover:underline"
        >
          Edit schedule on Profile →
        </Link>
      </section>
    </div>
  );
}
