"use client";

import { getSubjectLabel } from "@/lib/exam-config";

type TopicData = {
  name: string;
  slug: string;
  subject: string;
  total: number;
  correct: number;
  accuracy: number;
};

export function SatSkills({
  topics,
  title = "Skills",
}: {
  topics: TopicData[];
  title?: string;
}) {
  const practiced = topics.filter((t) => t.total > 0);

  return (
    <div className="h-full rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h2 className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        {title}
      </h2>
      <div className="space-y-0">
        {practiced.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            Complete practice sessions to see topic breakdown.
          </p>
        ) : (
          practiced.map((topic) => (
            <div
              key={topic.slug}
              className="flex items-center justify-between border-b border-border/40 py-2.5 last:border-0"
            >
              <div className="min-w-0 pr-3">
                <span className="text-sm font-medium">{topic.name}</span>
                <p className="text-xs text-muted-foreground">
                  {getSubjectLabel(topic.subject)}
                </p>
              </div>
              <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                {topic.accuracy}% ({topic.correct}/{topic.total})
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
