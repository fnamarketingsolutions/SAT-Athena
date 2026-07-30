"use client";

import Link from "next/link";
import { ArrowRight, BarChart3, BookOpen, CheckCircle2 } from "lucide-react";
import type { AccountabilityStatus } from "@/hooks/use-accountability-status";
import { EMBEDDED_TILE } from "@/components/dashboard/embedded-tile";
import { cn } from "@/lib/utils";

type DailyPracticeCardProps = {
  status: AccountabilityStatus | undefined;
  isLoading?: boolean;
  /** When true, drop outer margins so the card fits a grid cell. */
  embedded?: boolean;
};

/** Today's assigned practice — progress only, no XP/streak gamification. */
export function DailyQuestHero({
  status,
  isLoading,
  embedded = false,
}: DailyPracticeCardProps) {
  const shell = (node: React.ReactNode) => (
    <div className={cn(embedded ? EMBEDDED_TILE : "mb-10 w-full max-w-xl")}>
      {node}
    </div>
  );

  if (isLoading) {
    return shell(
      <div className="h-32 animate-pulse rounded-2xl border border-border bg-card" />
    );
  }

  const session = status?.quest;
  const completed = session?.status === "completed";

  // Always show a practice tile on the command center, even if accountability is off.
  if (!status?.enabled && !session) {
    return shell(
      <Link
        href="/quest"
        className="block rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:border-primary/40"
      >
        <div className="flex items-center gap-3 text-left">
          <BookOpen className="h-6 w-6 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-foreground">Today&apos;s practice</p>
            <p className="text-sm text-muted-foreground">
              Adaptive problems focused on your weak areas
            </p>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </div>
      </Link>
    );
  }

  if (!status?.enabled) return null;

  if (!session) {
    return shell(
      <Link
        href="/quest"
        className="block rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:border-primary/40"
      >
        <div className="flex items-center gap-3 text-left">
          <BookOpen className="h-6 w-6 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-foreground">Today&apos;s practice</p>
            <p className="text-sm text-muted-foreground">
              Adaptive problems focused on your weak areas
            </p>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </div>
      </Link>
    );
  }

  if (completed) {
    const accuracy =
      session.totalQuestions > 0
        ? Math.round((session.correctCount / session.totalQuestions) * 100)
        : 0;

    // Embedded: practice status only (Review Progress is its own grid tile).
    if (embedded) {
      return shell(
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-start gap-3 text-left">
            <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-accent" />
            <div className="flex-1">
              <p className="font-medium text-foreground">
                Today&apos;s practice complete
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {session.correctCount}/{session.totalQuestions} correct (
                {accuracy}%)
              </p>
              <Link
                href="/quest"
                className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                Review session
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return shell(
      <div className="space-y-3">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-start gap-3 text-left">
            <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-accent" />
            <div className="flex-1">
              <p className="font-medium text-foreground">
                Today&apos;s practice complete
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {session.correctCount}/{session.totalQuestions} correct (
                {accuracy}%)
              </p>
            </div>
          </div>
        </div>
        <Link
          href="/analytics"
          className="flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-4 text-left shadow-sm transition hover:border-primary/40"
        >
          <div className="flex items-center gap-3">
            <BarChart3 className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">
                Review your progress
              </p>
              <p className="text-xs text-muted-foreground">
                Scores, subjects, and focus areas
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      </div>
    );
  }

  const progress =
    session.totalQuestions > 0
      ? Math.round((session.answeredCount / session.totalQuestions) * 100)
      : 0;

  return shell(
    <Link
      href="/quest"
      className="block rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:border-primary/40"
    >
      <div className="flex items-start gap-3 text-left">
        <BookOpen className="mt-0.5 h-6 w-6 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">Today&apos;s practice</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {session.answeredCount > 0
              ? `${session.answeredCount} of ${session.totalQuestions} complete`
              : `${session.totalQuestions} problems tailored to your plan`}
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{
                width: `${Math.max(progress, session.answeredCount > 0 ? 4 : 0)}%`,
              }}
            />
          </div>
          {session.answeredCount > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              {progress}% complete
            </p>
          )}
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </div>
    </Link>
  );
}
