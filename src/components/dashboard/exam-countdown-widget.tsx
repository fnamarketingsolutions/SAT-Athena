"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock } from "lucide-react";
import {
  formatExamCountdown,
  readStoredExamDate,
  type ExamCountdown,
  type StoredExamDate,
} from "@/lib/exam-countdown";
import { cn } from "@/lib/utils";

function loadCountdown(): {
  stored: StoredExamDate | null;
  countdown: ExamCountdown | null;
} {
  const stored = readStoredExamDate();
  if (!stored) return { stored: null, countdown: null };
  return {
    stored,
    countdown: formatExamCountdown(stored.date, stored.label),
  };
}

export function ExamCountdownWidget() {
  const [mounted, setMounted] = useState(false);
  const { data } = useQuery({
    queryKey: ["exam-countdown"],
    queryFn: () => loadCountdown(),
    staleTime: 60_000,
    enabled: mounted,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="mb-10 h-24 w-full max-w-xl animate-pulse rounded-2xl border border-border bg-card" />
    );
  }

  if (!data?.stored || !data.countdown) {
    return (
      <div className="mb-10 w-full max-w-xl rounded-2xl border border-dashed border-border bg-card/60 p-5 text-left">
        <div className="flex items-start gap-3">
          <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium text-foreground">
              Set your exam date
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Pick a July or February sitting on your profile to see how much
              time you have left.
            </p>
            <Link
              href="/profile"
              className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
            >
              Choose exam date →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { countdown, stored } = data;
  const urgent = !countdown.isPast && countdown.days <= 30;

  return (
    <div
      className={cn(
        "mb-10 w-full max-w-xl rounded-2xl border p-5 text-left shadow-sm",
        countdown.isPast
          ? "border-amber-500/40 bg-amber-500/10"
          : urgent
            ? "border-primary/40 bg-primary/5"
            : "border-border bg-card"
      )}
    >
      <div className="flex items-start gap-3">
        <CalendarClock
          className={cn(
            "mt-0.5 h-5 w-5 shrink-0",
            countdown.isPast
              ? "text-amber-700 dark:text-amber-400"
              : "text-primary"
          )}
        />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Exam Countdown
          </p>
          <p className="mt-1 font-[family-name:var(--font-instrument-serif)] text-2xl text-foreground">
            {countdown.headline}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {new Date(`${stored.date}T12:00:00`).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
          <Link
            href="/profile"
            className="mt-3 inline-block text-xs font-medium text-primary hover:underline"
          >
            Change exam date
          </Link>
        </div>
      </div>
    </div>
  );
}
