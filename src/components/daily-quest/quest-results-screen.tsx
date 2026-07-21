"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Trophy,
  Zap,
  Clock,
  Target,
  ArrowRight,
  Percent,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuestContext } from "./quest-context";
import {
  averageSecondsPerQuestion,
  formatAveragePace,
  getPaceStatus,
  PACE_SECONDS_PER_QUESTION,
} from "@/lib/pacing";
import { cn } from "@/lib/utils";

function StatCard({
  icon: Icon,
  value,
  label,
}: {
  icon: LucideIcon;
  value: React.ReactNode;
  label: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-4 text-center shadow-sm">
      <Icon className="mx-auto mb-2 h-5 w-5 text-muted-foreground" aria-hidden />
      <p className="text-2xl font-bold tabular-nums text-foreground">{value}</p>
      <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

export function QuestResultsScreen() {
  const router = useRouter();
  const ctx = useQuestContext();

  const accuracy =
    ctx.problems.length > 0
      ? Math.round((ctx.score / ctx.problems.length) * 100)
      : 0;

  const minutes = Math.floor(ctx.elapsed / 60);
  const seconds = ctx.elapsed % 60;

  const answeredCount =
    ctx.problems.filter(
      (p) => p.isCorrect != null || ctx.answers.has(p.id) || p.selectedOption != null
    ).length || ctx.problems.length;
  const avgSeconds = averageSecondsPerQuestion(ctx.elapsed, answeredCount);
  const paceStatus = avgSeconds != null ? getPaceStatus(avgSeconds) : null;

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", duration: 0.5 }}
        className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm"
      >
        <div className="space-y-8">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary">
              <Trophy className="h-7 w-7 text-primary-foreground" aria-hidden />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Quest Complete!
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {accuracy >= 80
                ? "Outstanding performance!"
                : accuracy >= 60
                  ? "Good effort, keep pushing!"
                  : "Every quest makes you stronger."}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={Target}
              value={`${ctx.score}/${ctx.problems.length}`}
              label="Correct"
            />
            <StatCard icon={Percent} value={`${accuracy}%`} label="Accuracy" />
            <StatCard
              icon={Clock}
              value={`${minutes}:${seconds.toString().padStart(2, "0")}`}
              label="Time"
            />
            <StatCard icon={Zap} value={`+${ctx.xpEarned}`} label="XP Earned" />
          </div>

          {avgSeconds != null && (
            <div
              className={cn(
                "rounded-xl border px-4 py-3 text-center",
                paceStatus === "good"
                  ? "border-emerald-500/40 bg-emerald-500/10"
                  : "border-orange-500/40 bg-orange-500/10"
              )}
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Avg time per question
              </p>
              <p className="mt-1 text-xl font-bold tabular-nums text-foreground">
                {formatAveragePace(avgSeconds)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Target {Math.floor(PACE_SECONDS_PER_QUESTION / 60)}:
                {(PACE_SECONDS_PER_QUESTION % 60).toString().padStart(2, "0")}{" "}
                / q
                {paceStatus === "good"
                  ? " · On pace"
                  : " · Slower than exam pace"}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Performance by Focus
            </h3>
            {(["weak", "mid", "stretch"] as const).map((bucket) => {
              const bucketProblems = ctx.problems.filter((p) => p.bucket === bucket);
              if (bucketProblems.length === 0) return null;
              const correct = bucketProblems.filter((p) => p.isCorrect).length;
              const label =
                bucket === "weak"
                  ? "Weak Areas"
                  : bucket === "mid"
                    ? "Mid Level"
                    : "Stretch";
              return (
                <div
                  key={bucket}
                  className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3"
                >
                  <span className="text-sm text-foreground">{label}</span>
                  <span className="text-sm font-semibold tabular-nums text-foreground">
                    {correct}/{bucketProblems.length}
                  </span>
                </div>
              );
            })}
          </div>

          <Button
            onClick={() => router.push("/dashboard")}
            className="h-11 w-full gap-2 text-sm font-semibold uppercase tracking-wide"
          >
            Back to dashboard
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
