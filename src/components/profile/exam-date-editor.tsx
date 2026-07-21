"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarDays } from "lucide-react";
import {
  formatExamCountdown,
  formatSittingOption,
  getUpcomingExamSittings,
  readStoredExamDate,
  writeStoredExamDate,
  type StoredExamDate,
} from "@/lib/exam-countdown";
import { cn } from "@/lib/utils";

export function ExamDateEditor() {
  const queryClient = useQueryClient();
  const [stored, setStored] = useState<StoredExamDate | null>(null);
  const sittings = useMemo(() => getUpcomingExamSittings(), []);

  useEffect(() => {
    setStored(readStoredExamDate());
  }, []);

  const countdown = stored
    ? formatExamCountdown(stored.date, stored.label)
    : null;

  const selectSitting = (sittingId: string) => {
    if (!sittingId) {
      writeStoredExamDate(null);
      setStored(null);
      queryClient.invalidateQueries({ queryKey: ["exam-countdown"] });
      return;
    }
    const sitting = sittings.find((s) => s.id === sittingId);
    if (!sitting) return;
    const next: StoredExamDate = {
      date: sitting.date,
      label: sitting.label,
      sittingId: sitting.id,
    };
    writeStoredExamDate(next);
    setStored(next);
    queryClient.invalidateQueries({ queryKey: ["exam-countdown"] });
  };

  return (
    <div className="border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <CalendarDays className="h-4 w-4 text-muted-foreground" />
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Exam Date
        </p>
      </div>

      <p className="mt-3 text-sm text-muted-foreground">
        Choose your official sitting so the dashboard can show your countdown.
      </p>

      <label className="mt-4 block">
        <span className="sr-only">Select exam sitting</span>
        <select
          className={cn(
            "w-full rounded-md border border-border bg-background px-3 py-2 text-sm",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          )}
          value={stored?.sittingId ?? ""}
          onChange={(e) => selectSitting(e.target.value)}
        >
          <option value="">Select exam date…</option>
          {sittings.map((s) => (
            <option key={s.id} value={s.id}>
              {formatSittingOption(s)}
            </option>
          ))}
        </select>
      </label>

      {countdown && !countdown.isPast && (
        <p className="mt-3 text-sm font-medium text-foreground">
          {countdown.headline}
        </p>
      )}
      {countdown?.isPast && (
        <p className="mt-3 text-sm text-amber-700 dark:text-amber-400">
          {countdown.headline}
        </p>
      )}
    </div>
  );
}
