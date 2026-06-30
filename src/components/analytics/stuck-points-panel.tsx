"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, Target } from "lucide-react";
import type { StuckPoint } from "@/lib/db/queries/analytics";

export function StuckPointsPanel({
  stuckPoints,
}: {
  stuckPoints: StuckPoint[];
}) {
  const top = stuckPoints.filter((s) => s.stuckScore > 2).slice(0, 5);

  return (
    <div className="border bg-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Weak Areas
        </h2>
        {top.length > 0 && (
          <span className="text-xs text-muted-foreground">{top.length} need focus</span>
        )}
      </div>

      {top.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          No major weak spots detected yet. Keep practicing to build your mastery map.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {top.map((point) => (
            <div
              key={point.subtopicId}
              className="flex items-start justify-between gap-3 border-b border-border/40 pb-3 last:border-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{point.subtopicName}</p>
                <p className="text-xs text-muted-foreground">{point.topicName}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {point.metrics.accuracy}% accuracy · {point.metrics.totalAttempts} attempts
                </p>
              </div>
              <Link
                href={`/learning/${point.topicSlug}/${point.subtopicSlug}/micro-lesson`}
                className="shrink-0 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                {point.recommendation === "micro-lesson" ? (
                  <>
                    <BookOpen className="h-3.5 w-3.5" />
                    Lesson
                  </>
                ) : (
                  <>
                    <Target className="h-3.5 w-3.5" />
                    Practice
                  </>
                )}
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
