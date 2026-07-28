/**
 * Official NCBE bar exam sittings (February / July) and countdown helpers.
 *
 * Legacy UBE / MBE: MEE+MPT on the Tuesday before the last Wednesday of
 * February/July; MBE on that Wednesday. NextGen UBE uses the same Tue–Wed window.
 * @see https://www.ncbex.org/exams/mbe
 */

export const EXAM_DATE_STORAGE_KEY = "athena-exam-date";

export type ExamSitting = {
  /** e.g. "2026-07" */
  id: string;
  /** "July Exam" | "February Exam" */
  label: string;
  /** ISO date (YYYY-MM-DD) of day 1 — Tuesday before the MBE. */
  date: string;
  /** ISO date (YYYY-MM-DD) of day 2 — last Wednesday (MBE / NextGen day 2). */
  endDate: string;
};

export type StoredExamDate = {
  date: string;
  label: string;
  sittingId: string;
};

/** Last Wednesday of a calendar month (0-indexed month). NCBE MBE day. */
export function lastWednesdayOfMonth(year: number, monthIndex: number): Date {
  const lastDay = new Date(year, monthIndex + 1, 0);
  const dow = lastDay.getDay(); // 0 Sun … 6 Sat
  const offset = (dow - 3 + 7) % 7; // days since Wednesday
  lastDay.setDate(lastDay.getDate() - offset);
  lastDay.setHours(12, 0, 0, 0);
  return lastDay;
}

/** Tuesday immediately before the last Wednesday (essay / NextGen day 1). */
export function examTuesdayForMonth(year: number, monthIndex: number): Date {
  const wednesday = lastWednesdayOfMonth(year, monthIndex);
  const tuesday = new Date(wednesday);
  tuesday.setDate(wednesday.getDate() - 1);
  return tuesday;
}

/** @deprecated Use lastWednesdayOfMonth / examTuesdayForMonth — kept for callers. */
export function lastTuesdayOfMonth(year: number, monthIndex: number): Date {
  return examTuesdayForMonth(year, monthIndex);
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function sittingForMonth(
  year: number,
  monthIndex: number,
  label: "February Exam" | "July Exam"
): ExamSitting {
  const tuesday = examTuesdayForMonth(year, monthIndex);
  const wednesday = lastWednesdayOfMonth(year, monthIndex);
  return {
    id: `${year}-${String(monthIndex + 1).padStart(2, "0")}`,
    label,
    date: toIsoDate(tuesday),
    endDate: toIsoDate(wednesday),
  };
}

/**
 * Upcoming February + July sittings (next ~3 years).
 * Past sittings (exam week fully over) are omitted.
 */
export function getUpcomingExamSittings(
  from: Date = new Date(),
  yearsAhead = 3
): ExamSitting[] {
  const sittings: ExamSitting[] = [];
  const startYear = from.getFullYear();
  const today = startOfLocalDay(from);

  for (let y = startYear; y <= startYear + yearsAhead; y++) {
    for (const { month, label } of [
      { month: 1, label: "February Exam" as const },
      { month: 6, label: "July Exam" as const },
    ]) {
      const sitting = sittingForMonth(y, month, label);
      const end = startOfLocalDay(new Date(`${sitting.endDate}T12:00:00`));
      // Keep the sitting through the final exam day; drop once the week is over.
      if (end < today) continue;
      sittings.push(sitting);
    }
  }

  return sittings.sort((a, b) => a.date.localeCompare(b.date));
}

export function daysUntilExam(examDateIso: string, from: Date = new Date()): number {
  const exam = startOfLocalDay(new Date(`${examDateIso}T12:00:00`));
  const today = startOfLocalDay(from);
  return Math.round((exam.getTime() - today.getTime()) / 86_400_000);
}

export type ExamCountdown = {
  days: number;
  weeks: number;
  /** Primary headline, e.g. "45 days until the July Exam" */
  headline: string;
  /** Shorter banner line */
  shortLabel: string;
  isToday: boolean;
  isPast: boolean;
};

export function formatExamCountdown(
  examDateIso: string,
  label: string,
  from: Date = new Date()
): ExamCountdown {
  const days = daysUntilExam(examDateIso, from);
  const weeks = Math.max(0, Math.round(days / 7));

  if (days < 0) {
    return {
      days,
      weeks: 0,
      headline: `${label} has passed — pick your next sitting`,
      shortLabel: "Exam date passed",
      isToday: false,
      isPast: true,
    };
  }

  if (days === 0) {
    return {
      days: 0,
      weeks: 0,
      headline: `Today is the ${label}`,
      shortLabel: `Today · ${label}`,
      isToday: true,
      isPast: false,
    };
  }

  // Prefer days when within ~2 months; weeks when further out (matches product examples).
  if (days <= 60) {
    const unit = days === 1 ? "day" : "days";
    return {
      days,
      weeks,
      headline: `${days} ${unit} until the ${label}`,
      shortLabel: `${days} ${unit} until exam`,
      isToday: false,
      isPast: false,
    };
  }

  const unit = weeks === 1 ? "week" : "weeks";
  return {
    days,
    weeks,
    headline: `${weeks} ${unit} until the ${label}`,
    shortLabel: `${weeks} ${unit} until exam`,
    isToday: false,
    isPast: false,
  };
}

/** e.g. "February Exam · Feb 22–23, 2028" */
export function formatSittingOption(sitting: ExamSitting): string {
  const start = new Date(`${sitting.date}T12:00:00`);
  const end = new Date(`${sitting.endDate}T12:00:00`);
  const month = start.toLocaleDateString("en-US", { month: "short" });
  const year = start.getFullYear();
  return `${sitting.label} · ${month} ${start.getDate()}–${end.getDate()}, ${year}`;
}

/**
 * If a saved sitting id still exists, refresh its dates from the official calendar.
 * Clears storage when the sitting is fully in the past.
 */
export function reconcileStoredExamDate(
  stored: StoredExamDate | null,
  from: Date = new Date()
): StoredExamDate | null {
  if (!stored) return null;
  const upcoming = getUpcomingExamSittings(from);
  const match = upcoming.find((s) => s.id === stored.sittingId);
  if (match) {
    return {
      date: match.date,
      label: match.label,
      sittingId: match.id,
    };
  }
  // Sitting id not upcoming — drop if past; keep only if somehow still valid date ahead
  if (daysUntilExam(stored.date, from) < 0) return null;
  return stored;
}

export function readStoredExamDate(): StoredExamDate | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(EXAM_DATE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredExamDate;
    if (!parsed?.date || !parsed?.label) return null;
    const reconciled = reconcileStoredExamDate(parsed);
    // Persist corrected official dates (e.g. Feb 29 → Feb 22) or clear past sittings.
    if (
      !reconciled ||
      reconciled.date !== parsed.date ||
      reconciled.label !== parsed.label
    ) {
      writeStoredExamDate(reconciled);
    }
    return reconciled;
  } catch {
    return null;
  }
}

export function writeStoredExamDate(value: StoredExamDate | null): void {
  if (typeof window === "undefined") return;
  try {
    if (!value) localStorage.removeItem(EXAM_DATE_STORAGE_KEY);
    else localStorage.setItem(EXAM_DATE_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // ignore quota / private mode
  }
}
