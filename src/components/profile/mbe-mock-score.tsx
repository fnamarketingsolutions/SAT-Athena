"use client";

import Link from "next/link";
import { MOCK_EXAM_LABEL, MOCK_EXAM_ROUTE } from "@/lib/exam-config";

type MockAttempt = {
  id: string;
  correct: number;
  total: number;
  percentScore: number | null;
  passed: boolean;
  completedAt: string | null;
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function scoreColor(percent: number | null): string {
  if (percent === null) return "text-muted-foreground";
  if (percent >= 65) return "text-green-500";
  if (percent >= 45) return "text-amber-500";
  return "text-red-500";
}

export function MbeMockScore({
  latestAttempt,
}: {
  latestAttempt: MockAttempt | null;
}) {
  if (!latestAttempt) {
    return (
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Latest {MOCK_EXAM_LABEL}
        </h3>
        <p className="mt-3 text-sm text-muted-foreground">
          No mock exam scores yet.{" "}
          <Link href={MOCK_EXAM_ROUTE} className="underline hover:text-foreground">
            Take a practice exam
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Latest {MOCK_EXAM_LABEL}
      </h3>
      <div className="mt-4">
        <span
          className={`text-3xl font-bold ${scoreColor(latestAttempt.percentScore)}`}
        >
          {latestAttempt.percentScore != null
            ? `${latestAttempt.percentScore}%`
            : "—"}
        </span>
        <div className="mt-1 flex gap-4 text-sm text-muted-foreground">
          <span>
            {latestAttempt.correct}/{latestAttempt.total} correct
          </span>
          {latestAttempt.passed && (
            <span className="text-green-600">Pass target met</span>
          )}
        </div>
        {latestAttempt.completedAt && (
          <p className="mt-1 text-xs text-muted-foreground">
            {formatDate(latestAttempt.completedAt)}
          </p>
        )}
      </div>
    </div>
  );
}
