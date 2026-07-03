"use client";

import { motion } from "framer-motion";

type SubjectScore = {
  subject: string;
  label: string;
  shortLabel: string;
  total: number;
  correct: number;
  accuracy: number;
};

export function MbeSubjectScores({
  subjects,
  targetPercent,
}: {
  subjects: SubjectScore[];
  targetPercent: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {subjects.map((s) => (
        <SubjectCard key={s.subject} subject={s} targetPercent={targetPercent} />
      ))}
    </div>
  );
}

function SubjectCard({
  subject,
  targetPercent,
}: {
  subject: SubjectScore;
  targetPercent: number;
}) {
  const pct = subject.total > 0 ? subject.accuracy : 0;
  const atTarget = subject.total > 0 && subject.accuracy >= targetPercent;

  return (
    <div className="border bg-card p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
        {subject.shortLabel}
      </p>
      <div className="mt-1.5 flex items-baseline gap-1">
        <span className="text-2xl font-bold tabular-nums">
          {subject.total > 0 ? `${subject.accuracy}%` : "—"}
        </span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden bg-muted">
        <motion.div
          className={atTarget ? "h-full bg-primary" : "h-full bg-foreground/60"}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(pct, 100)}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">
        {subject.total > 0
          ? `${subject.correct}/${subject.total} correct`
          : "No practice yet"}
      </p>
    </div>
  );
}
