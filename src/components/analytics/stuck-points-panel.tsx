"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, ChevronDown, ChevronUp, Target } from "lucide-react";
import type { StuckPoint } from "@/lib/db/queries/analytics";

const PREVIEW_COUNT = 5;

function attemptLabel(count: number): string {
  return `${count} attempt${count === 1 ? "" : "s"}`;
}

export function StuckPointsPanel({
  stuckPoints,
}: {
  stuckPoints: StuckPoint[];
}) {
  const [expanded, setExpanded] = useState(false);
  const all = stuckPoints;
  const visible = expanded ? all : all.slice(0, PREVIEW_COUNT);
  const hiddenCount = Math.max(0, all.length - PREVIEW_COUNT);

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Weak Areas
        </h2>
        {all.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {all.length} need{all.length === 1 ? "s" : ""} focus
          </span>
        )}
      </div>

      {all.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          No major weak spots detected yet. Keep practicing to build your
          mastery map.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {visible.map((point) => {
            const lessonHref = `/learning/${point.topicSlug}/${point.subtopicSlug}/micro-lesson`;
            const practiceHref = `/learning/${point.topicSlug}/${point.subtopicSlug}/quiz`;

            return (
              <div
                key={point.subtopicId}
                className="flex items-start justify-between gap-3 border-b border-border/40 pb-3 last:border-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {point.subtopicName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {point.topicName}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {point.metrics.accuracy}% accuracy ·{" "}
                    {attemptLabel(point.metrics.totalAttempts)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center">
                  <Link
                    href={lessonHref}
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    Lesson
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                  <Link
                    href={practiceHref}
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    <Target className="h-3.5 w-3.5" />
                    Practice
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            );
          })}

          {hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="inline-flex w-full items-center justify-center gap-1.5 pt-1 text-xs font-medium text-primary hover:underline"
            >
              {expanded ? (
                <>
                  Show less
                  <ChevronUp className="h-3.5 w-3.5" />
                </>
              ) : (
                <>
                  View all {all.length} weak areas
                  <ChevronDown className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
