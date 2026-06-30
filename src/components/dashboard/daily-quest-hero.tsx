"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, BarChart3, CheckCircle2, Flame, Swords, Zap } from "lucide-react";
import type { AccountabilityStatus } from "@/hooks/use-accountability-status";

type DailyQuestHeroProps = {
  status: AccountabilityStatus | undefined;
  isLoading?: boolean;
};

export function DailyQuestHero({ status, isLoading }: DailyQuestHeroProps) {
  if (isLoading) {
    return (
      <div
        className="play-card mb-10 h-36 w-full max-w-xl animate-pulse rounded-2xl"
        style={{ background: "var(--p-surface)", border: "1px solid var(--p-rule)" }}
      />
    );
  }

  const quest = status?.quest;
  const streak = status?.streak ?? 0;
  const locked = Boolean(status?.enabled && status.locked);
  const completed = quest?.status === "completed";

  if (!status?.enabled) return null;

  if (!quest) {
    return (
      <Link href="/quest" className="play-card mb-10 block w-full max-w-xl">
        <div
          className="rounded-2xl px-6 py-6 text-left transition hover:border-[var(--p-accent)]/50"
          style={{
            background: "var(--p-surface)",
            border: "1px solid var(--p-rule)",
          }}
        >
          <div className="flex items-center gap-3">
            <Swords className="h-6 w-6 text-[var(--p-accent)]" />
            <div>
              <p className="font-medium text-[var(--p-fg)]">Your daily quest is ready</p>
              <p className="text-sm text-[var(--p-fg-mute)]">
                Adaptive problems tuned to your weak areas
              </p>
            </div>
            <ArrowRight className="ml-auto h-4 w-4 text-[var(--p-accent)]" />
          </div>
        </div>
      </Link>
    );
  }

  if (completed) {
    const accuracy =
      quest.totalQuestions > 0
        ? Math.round((quest.correctCount / quest.totalQuestions) * 100)
        : 0;

    return (
      <div className="mb-10 w-full max-w-xl space-y-3">
        <div
          className="play-card rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-6 py-5 text-left"
        >
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-green-400" />
            <div className="flex-1">
              <p className="font-medium text-[var(--p-fg)]">Daily quest complete</p>
              <p className="text-sm text-[var(--p-fg-mute)]">
                {quest.correctCount}/{quest.totalQuestions} correct ({accuracy}%)
              </p>
            </div>
            {streak > 0 && (
              <div className="flex items-center gap-1 text-[var(--p-accent)]">
                <Flame className="h-4 w-4" />
                <span className="text-sm font-semibold">{streak}d</span>
              </div>
            )}
            <div className="flex items-center gap-1 text-[var(--p-accent)]">
              <Zap className="h-4 w-4" />
              <span className="text-sm font-semibold">+{quest.xpEarned}</span>
            </div>
          </div>
        </div>
        <Link
          href="/analytics"
          className="play-card flex items-center justify-between rounded-2xl px-5 py-4 text-left transition hover:border-[var(--p-accent)]/50"
          style={{
            background: "var(--p-surface)",
            border: "1px solid var(--p-rule)",
          }}
        >
          <div className="flex items-center gap-3">
            <BarChart3 className="h-5 w-5 text-[var(--p-accent)]" />
            <div>
              <p className="text-sm font-medium text-[var(--p-fg)]">Review your progress</p>
              <p className="text-xs text-[var(--p-fg-mute)]">Scores, weak areas, and streaks</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-[var(--p-accent)]" />
        </Link>
      </div>
    );
  }

  const progress =
    quest.totalQuestions > 0
      ? Math.round((quest.answeredCount / quest.totalQuestions) * 100)
      : 0;

  return (
    <Link href="/quest" className="play-card mb-10 block w-full max-w-xl">
      <motion.div
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className="rounded-2xl px-6 py-6 text-left"
        style={{
          background: locked
            ? "linear-gradient(180deg, oklch(0.12 0.06 55 / 0.45), oklch(0.05 0.01 60 / 0.55))"
            : "var(--p-surface)",
          border: locked
            ? "1px solid oklch(0.65 0.14 60 / 0.45)"
            : "1px solid var(--p-rule)",
        }}
      >
        <div className="flex items-start gap-3">
          <Swords className="mt-0.5 h-6 w-6 shrink-0 text-[var(--p-accent)]" />
          <div className="flex-1">
            <p className="font-medium text-[var(--p-fg)]">
              {locked ? "Complete today's quest to unlock" : "Daily Quest"}
            </p>
            <p className="mt-1 text-sm text-[var(--p-fg-mute)]">
              {quest.answeredCount > 0
                ? `${quest.answeredCount}/${quest.totalQuestions} answered · ${progress}% done`
                : `${quest.totalQuestions} adaptive questions tailored to you`}
            </p>
            {quest.answeredCount > 0 && (
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--p-rule)]">
                <div
                  className="h-full rounded-full bg-[var(--p-accent)] transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
            {streak > 0 && (
              <div className="mt-3 flex items-center gap-1 text-xs text-[var(--p-fg-dim)]">
                <Flame className="h-3.5 w-3.5 text-[var(--p-accent)]" />
                {streak}-day streak — keep it going
              </div>
            )}
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-[var(--p-accent)]" />
        </div>
      </motion.div>
    </Link>
  );
}
