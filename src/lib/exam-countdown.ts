/**
 * Official-style bar exam sittings (February / July) and countdown helpers.
 * MBE is typically the last Tuesday–Wednesday of February and July.
 */

export const EXAM_DATE_STORAGE_KEY = "athena-exam-date";

export type ExamSitting = {
  /** e.g. "2026-07" */
  id: string;
  /** "July Exam" | "February Exam" */
  label: string;
  /** ISO date (YYYY-MM-DD) of the first exam day (Tuesday). */
  date: string;
};

export type StoredExamDate = {
  date: string;
  label: string;
  sittingId: string;
};

/** Last Tuesday of a calendar month (0-indexed month). */
export function lastTuesdayOfMonth(year: number, monthIndex: number): Date {
  const lastDay = new Date(year, monthIndex + 1, 0);
  const dow = lastDay.getDay(); // 0 Sun … 6 Sat
  const offset = (dow + 5) % 7; // days since Tuesday
  lastDay.setDate(lastDay.getDate() - offset);
  lastDay.setHours(12, 0, 0, 0);
  return lastDay;
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

/** Upcoming February + July sittings (next ~3 years). */
export function getUpcomingExamSittings(
  from: Date = new Date(),
  yearsAhead = 3
): ExamSitting[] {
  const sittings: ExamSitting[] = [];
  const startYear = from.getFullYear();

  for (let y = startYear; y <= startYear + yearsAhead; y++) {
    for (const { month, label } of [
      { month: 1, label: "February Exam" },
      { month: 6, label: "July Exam" },
    ] as const) {
      const tuesday = lastTuesdayOfMonth(y, month);
      if (startOfLocalDay(tuesday) < startOfLocalDay(from)) continue;
      const date = toIsoDate(tuesday);
      sittings.push({
        id: `${y}-${String(month + 1).padStart(2, "0")}`,
        label,
        date,
      });
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

export function formatSittingOption(sitting: ExamSitting): string {
  const d = new Date(`${sitting.date}T12:00:00`);
  const pretty = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${sitting.label} · ${pretty}`;
}

export function readStoredExamDate(): StoredExamDate | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(EXAM_DATE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredExamDate;
    if (!parsed?.date || !parsed?.label) return null;
    return parsed;
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
