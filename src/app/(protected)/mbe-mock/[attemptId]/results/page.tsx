"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Trophy,
  Clock,
  ArrowRight,
  Target,
  Percent,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { ReviewItem } from "@/components/quiz/review-item";
import { MOCK_EXAM_LABEL } from "@/lib/exam-config";
import {
  formatAveragePace,
  PACE_SECONDS_PER_QUESTION,
  type PaceStatus,
} from "@/lib/pacing";
import { cn } from "@/lib/utils";
import type { Problem } from "@/components/quiz/types";

type ResultsPayload = {
  attemptId: string;
  completedAt: string | null;
  totalTimeSeconds: number;
  summary: {
    correct: number;
    total: number;
    answeredCount: number;
    percent: number;
    passed: boolean;
    passTarget: number;
    avgSecondsPerQuestion: number | null;
    paceStatus: PaceStatus | null;
  };
  subjects: {
    key: string;
    label: string;
    correct: number;
    total: number;
    accuracy: number;
  }[];
  questions: {
    index: number;
    problemId: string;
    subject: string;
    subjectLabel: string;
    difficulty: string;
    questionText: string;
    options: string[];
    correctOption: number;
    explanation: string;
    solutionSteps: { step: number; instruction: string; math?: string }[];
    selectedOption: number | null;
    isCorrect: boolean | null;
  }[];
};

function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const mins = m % 60;
    return `${h}h ${mins}m`;
  }
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

export default function FullSatResultsPage() {
  const router = useRouter();
  const params = useParams<{ attemptId: string }>();
  const [results, setResults] = useState<ResultsPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchResults() {
      try {
        const res = await fetch(`/api/mbe-mock/${params.attemptId}/results`);
        if (!res.ok) throw new Error("Failed to fetch");
        setResults(await res.json());
      } catch {
        setResults(null);
      } finally {
        setLoading(false);
      }
    }
    fetchResults();
  }, [params.attemptId]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  if (!results) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Results not available yet.</p>
        <button
          onClick={() => router.push("/mbe-mock")}
          className="text-sm font-medium text-primary hover:underline"
        >
          Back to {MOCK_EXAM_LABEL}
        </button>
      </div>
    );
  }

  const { summary, subjects, questions } = results;
  const avgSeconds = summary.avgSecondsPerQuestion;
  const paceStatus = summary.paceStatus;

  return (
    <div className="fixed inset-x-0 bottom-0 top-14 z-40 flex flex-col overflow-auto bg-background md:left-[15rem] md:top-0">
      <div className="mx-auto w-full max-w-3xl px-4 py-10 pb-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm"
        >
          <div className="mb-4 flex items-center justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary">
              <Trophy className="h-7 w-7 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            {MOCK_EXAM_LABEL} Complete
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {summary.passed
              ? `You met the ${summary.passTarget}% pass benchmark.`
              : `Below the ${summary.passTarget}% pass benchmark — keep practicing.`}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
          <div className="rounded-xl border border-border bg-card p-4 text-center shadow-sm">
            <Percent className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
            <p className="text-2xl font-bold tabular-nums">{summary.percent}%</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
              Accuracy
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 text-center shadow-sm">
            <Target className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
            <p className="text-2xl font-bold tabular-nums">
              {summary.correct}/{summary.total}
            </p>
            <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
              Correct
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 text-center shadow-sm">
            <Clock className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
            <p className="text-2xl font-bold tabular-nums">
              {formatDuration(results.totalTimeSeconds)}
            </p>
            <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
              Total time
            </p>
          </div>
          <div
            className={cn(
              "rounded-xl border p-4 text-center shadow-sm",
              summary.passed
                ? "border-emerald-500/40 bg-emerald-500/10"
                : "border-red-500/40 bg-red-500/10"
            )}
          >
            {summary.passed ? (
              <CheckCircle2 className="mx-auto mb-2 h-5 w-5 text-emerald-600" />
            ) : (
              <XCircle className="mx-auto mb-2 h-5 w-5 text-red-600" />
            )}
            <p className="text-2xl font-bold tabular-nums">
              {summary.passed ? "Pass" : "Below"}
            </p>
            <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
              vs {summary.passTarget}%
            </p>
          </div>
        </motion.div>

        {avgSeconds != null && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={cn(
              "mt-6 rounded-2xl border px-5 py-4 text-center shadow-sm",
              paceStatus === "good"
                ? "border-emerald-500/40 bg-emerald-500/10"
                : "border-orange-500/40 bg-orange-500/10"
            )}
          >
            <div className="mb-1 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              Avg time per question
            </div>
            <p className="text-2xl font-bold tabular-nums text-foreground">
              {formatAveragePace(avgSeconds)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Target {Math.floor(PACE_SECONDS_PER_QUESTION / 60)}:
              {(PACE_SECONDS_PER_QUESTION % 60).toString().padStart(2, "0")} / q
              {paceStatus === "good"
                ? " · On pace"
                : " · Slower than exam pace"}
            </p>
          </motion.div>
        )}

        {subjects.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm"
          >
            <h2 className="mb-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              By Subject
            </h2>
            <div className="space-y-3">
              {subjects.map((s) => (
                <div key={s.key}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium">{s.label}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {s.correct}/{s.total} · {s.accuracy}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${s.accuracy}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8"
        >
          <h2 className="mb-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Question Review & Explanations
          </h2>
          <div className="space-y-4">
            {questions.map((q) => {
              const problem: Problem = {
                id: q.problemId,
                orderIndex: q.index,
                difficulty: q.difficulty,
                questionText: q.questionText,
                options: q.options,
                correctOption: q.correctOption,
                explanation: q.explanation || "No explanation provided.",
                solutionSteps: (q.solutionSteps ?? []).map((step) => ({
                  step: step.step,
                  instruction: step.instruction,
                  math: step.math ?? "",
                })),
                hint: "",
                timeRecommendationSeconds: 90,
              };
              return (
                <div key={q.problemId}>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    {q.subjectLabel}
                  </p>
                  <ReviewItem
                    problem={problem}
                    index={q.index}
                    selectedOption={
                      q.selectedOption != null ? q.selectedOption : undefined
                    }
                  />
                </div>
              );
            })}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-8 flex flex-col gap-3 sm:flex-row"
        >
          <button
            onClick={() => router.push("/mbe-mock")}
            className="flex-1 rounded-md border px-4 py-3 text-sm font-medium transition-colors hover:bg-muted"
          >
            Back to {MOCK_EXAM_LABEL}
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Dashboard
            <ArrowRight className="h-4 w-4" />
          </button>
        </motion.div>
      </div>
    </div>
  );
}
