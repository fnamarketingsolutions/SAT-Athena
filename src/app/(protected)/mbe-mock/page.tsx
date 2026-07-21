"use client";

import { useRouter } from "next/navigation";
import {
  useFullSatStatus,
  useStartFullSat,
  useFullSatHistory,
  useGenerateFullSat,
} from "@/hooks/use-full-sat";
import { motion } from "framer-motion";
import { Clock, Trophy, Lock, ArrowRight, ChevronLeft, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  MOCK_EXAM_DESCRIPTION,
  MOCK_EXAM_LABEL,
} from "@/lib/exam-config";
import { MOCK_EXAM_QUESTION_COUNT } from "@/lib/mbe-mock/constants";

function formatDaysUntil(dateString: string): string {
  const diff = new Date(dateString).getTime() - Date.now();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Available now";
  if (days === 1) return "1 day";
  return `${days} days`;
}

export default function FullSatLandingPage() {
  const router = useRouter();
  const { data: status, isLoading } = useFullSatStatus();
  const { data: history } = useFullSatHistory();
  const startMutation = useStartFullSat();
  const generateMutation = useGenerateFullSat();

  if (isLoading || !status) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  const handleStart = async (testId: string) => {
    const result = await startMutation.mutateAsync({ testId });
    router.push(`/mbe-mock/${result.attemptId}`);
  };

  const handleGenerateAndStart = async () => {
    try {
      const generated = await generateMutation.mutateAsync();
      toast.success(
        `Generated ${generated.questionCount} questions across all MBE subjects`
      );
      const result = await startMutation.mutateAsync({
        testId: generated.test.id,
      });
      router.push(`/mbe-mock/${result.attemptId}`);
    } catch {
      // toasts handled in mutations
    }
  };

  const handleResume = () => {
    if (status.currentAttempt) {
      router.push(`/mbe-mock/${status.currentAttempt.id}`);
    }
  };

  const busy = generateMutation.isPending || startMutation.isPending;
  const canGenerate =
    status.canTakeTest && !status.currentAttempt && !busy;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <button
        onClick={() => router.push("/dashboard")}
        className="mb-6 flex items-center gap-1.5 text-base text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-5 w-5" />
        Dashboard
      </button>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-bold tracking-tight">{MOCK_EXAM_LABEL}</h1>
        <p className="mt-2 text-muted-foreground">{MOCK_EXAM_DESCRIPTION}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {MOCK_EXAM_QUESTION_COUNT} questions · ~14 per subject · Time Pace
          locked ON · No instant feedback
        </p>
        <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
          <li>• Mixed subjects in one continuous block</li>
          <li>• Per-question pacing monitor stays on for the full exam</li>
          <li>• Right/wrong feedback and explanations only on the summary</li>
        </ul>
      </motion.div>

      {!status.canTakeTest && status.nextAvailableDate && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6 flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3"
        >
          <Lock className="h-5 w-5 shrink-0 text-amber-500" />
          <div>
            <p className="text-sm font-medium">Cooldown Active</p>
            <p className="text-xs text-muted-foreground">
              Next test available in {formatDaysUntil(status.nextAvailableDate)}
            </p>
          </div>
        </motion.div>
      )}

      {status.currentAttempt && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6"
        >
          <button
            onClick={handleResume}
            className="w-full rounded-lg border-2 border-primary bg-primary/5 px-6 py-4 text-left transition-colors hover:bg-primary/10"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">Resume In-Progress Test</p>
                <p className="text-sm text-muted-foreground">
                  Started{" "}
                  {new Date(
                    status.currentAttempt.startedAt
                  ).toLocaleDateString()}
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-primary" />
            </div>
          </button>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 rounded-lg border border-border bg-card p-5"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">Generate a new mock exam</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Questions are created with AI across all seven bar exam subjects.
              No seeded bank required.
            </p>
          </div>
          <button
            onClick={handleGenerateAndStart}
            disabled={!canGenerate}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            {generateMutation.isPending
              ? "Generating…"
              : startMutation.isPending
                ? "Starting…"
                : "Generate & Start"}
          </button>
        </div>
      </motion.div>

      {status.tests.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Available Tests
          </h2>
          {status.tests.map((test) => (
            <motion.div
              key={test.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg border bg-card p-5"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold">{test.name}</h3>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      Timed
                    </span>
                    <span>MBE subjects</span>
                  </div>
                </div>
                <button
                  onClick={() => handleStart(test.id)}
                  disabled={
                    !status.canTakeTest ||
                    !!status.currentAttempt ||
                    startMutation.isPending
                  }
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {startMutation.isPending ? "Starting..." : "Start"}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {history?.attempts && history.attempts.length > 0 && (
        <div className="mt-10 space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Past Attempts
          </h2>
          {history.attempts
            .filter((a) => a.status === "completed")
            .map((attempt) => (
              <div
                key={attempt.id}
                className="flex items-center justify-between rounded-lg border bg-card p-4"
              >
                <div>
                  <p className="text-sm font-medium">
                    {new Date(attempt.completedAt!).toLocaleDateString(
                      "en-US",
                      {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      }
                    )}
                  </p>
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    <span>
                      Score:{" "}
                      {attempt.totalScore != null
                        ? attempt.totalScore <= 100
                          ? `${attempt.totalScore}%`
                          : attempt.totalScore
                        : "—"}
                    </span>
                    <span>
                      Time: {Math.round(attempt.totalTimeSeconds / 60)}m
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-primary" />
                  <span className="text-lg font-bold tabular-nums">
                    {attempt.totalScore}
                  </span>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
