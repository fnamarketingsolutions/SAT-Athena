"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronLeft } from "lucide-react";
import { ProgressHeader } from "@/components/progress/progress-header";
import { SectionScores } from "@/components/progress/section-scores";
import { SatSkills } from "@/components/progress/sat-skills";
import { CompositeScore } from "@/components/progress/composite-score";
import { ScoreHistory } from "@/components/progress/score-history";
import { StudyStats } from "@/components/progress/study-stats";
import { TopicMastery } from "@/components/progress/topic-mastery";
import { PracticeTestResults } from "@/components/progress/practice-test-results";
import { JourneyRanks } from "@/components/progress/journey-ranks";
import { StuckPointsPanel } from "@/components/analytics/stuck-points-panel";
import { EngagementPanel } from "@/components/analytics/engagement-panel";
import { ConsistencyPanel } from "@/components/analytics/consistency-panel";
import type { StuckPoint, EngagementSummary } from "@/lib/db/queries/analytics";

type AnalyticsData = {
  user: {
    displayName: string | null;
    avatarUrl: string | null;
    targetScore: number | null;
    skillScore: number | null;
    startComposite: number | null;
  };
  compositeScore: number;
  rwScore: number;
  mathScore: number;
  targetScore: number;
  forecastWeeks: number | null;
  scoreHistory: { date: string; score: number }[];
  topicPerformance: {
    name: string;
    slug: string;
    subject: string;
    total: number;
    correct: number;
    accuracy: number;
  }[];
  recentSessions: {
    id: string;
    subtopicName: string;
    score: number;
    totalQuestions: number;
    timeElapsedSeconds: number;
    date: string;
  }[];
  overallStats: {
    totalQuestions: number;
    accuracy: number;
    totalTimeSeconds: number;
    sessionCount: number;
    avgScore: number;
  };
  sectionScores: {
    readingWriting: {
      subject: string;
      total: number;
      correct: number;
      accuracy: number;
      scaledScore: number;
    };
    math: {
      subject: string;
      total: number;
      correct: number;
      accuracy: number;
      scaledScore: number;
    };
  };
  topicMastery: {
    items: { name: string; mastered: boolean; attempted: boolean }[];
    masteredCount: number;
    totalCount: number;
  };
  stuckPoints: StuckPoint[];
  engagement: EngagementSummary;
  consistency: {
    questStreak: number;
    bestStreak: number;
    weekQuestDays: {
      date: string;
      day: string;
      completed: boolean;
      isToday: boolean;
    }[];
    questsCompletedThisWeek: number;
  };
  fullSatAttempts: {
    id: string;
    totalScore: number;
    rwScaledScore: number | null;
    mathScaledScore: number | null;
    completedAt: string | null;
  }[];
};

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export function AnalyticsDashboard() {
  const { data, isLoading, isError } = useQuery<AnalyticsData>({
    queryKey: ["analytics-dashboard", "v2"],
    queryFn: () =>
      fetch("/api/analytics/dashboard").then((r) => {
        if (!r.ok) throw new Error("Failed to load analytics");
        return r.json();
      }),
    staleTime: 60_000,
  });

  useEffect(() => {
    if (isError) toast.error("Failed to load analytics");
  }, [isError]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <div className="h-16 w-72 animate-pulse bg-muted" />
        <div className="mt-8 space-y-6">
          <div className="h-40 animate-pulse bg-muted" />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="h-48 animate-pulse bg-muted lg:col-span-2" />
            <div className="h-48 animate-pulse bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const rwSection = {
    ...data.sectionScores.readingWriting,
    scaledScore: data.rwScore,
  };
  const mathSection = {
    ...data.sectionScores.math,
    scaledScore: data.mathScore,
  };

  return (
    <div className="p-6 pb-16">
      <motion.div
        className="mx-auto max-w-5xl"
        variants={staggerContainer}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={staggerItem}>
          <Link
            href="/dashboard"
            className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium uppercase tracking-widest text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            Dashboard
          </Link>
          <ProgressHeader
            eyebrow="Analytics"
            title="Your SAT Analytics"
            subtitle="Scores, mastery, weak areas, and consistency"
          />
        </motion.div>

        {data.forecastWeeks &&
          data.user.startComposite &&
          data.compositeScore < data.targetScore && (
          <motion.p
            variants={staggerItem}
            className="mt-4 text-sm text-muted-foreground"
          >
            At your current pace, you could reach {data.targetScore} in about{" "}
            <span className="font-medium text-foreground">{data.forecastWeeks} weeks</span>
            {data.user.startComposite < data.compositeScore && (
              <> (up from {data.user.startComposite})</>
            )}
            .
          </motion.p>
        )}

        <motion.div variants={staggerItem}>
          <h2 className="mb-3 mt-8 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Score Overview
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <motion.div className="grid gap-6 lg:col-span-3" variants={staggerItem}>
            <SectionScores
              rw={rwSection}
              math={mathSection}
              targetScore={data.targetScore}
            />
            <CompositeScore
              score={data.compositeScore}
              targetScore={data.targetScore}
            />
          </motion.div>
          <motion.div className="lg:col-span-2" variants={staggerItem}>
            <ConsistencyPanel {...data.consistency} />
          </motion.div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <motion.div variants={staggerItem}>
            <StuckPointsPanel stuckPoints={data.stuckPoints} />
          </motion.div>
          <motion.div variants={staggerItem}>
            <EngagementPanel engagement={data.engagement} />
          </motion.div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
          <motion.div className="lg:col-span-3" variants={staggerItem}>
            <ScoreHistory data={data.scoreHistory} />
          </motion.div>
          <motion.div className="space-y-6 lg:col-span-2" variants={staggerItem}>
            <StudyStats stats={data.overallStats} />
            <TopicMastery mastery={data.topicMastery} />
          </motion.div>
        </div>

        <motion.div className="mt-6" variants={staggerItem}>
          <SatSkills topics={data.topicPerformance} />
        </motion.div>

        <motion.div className="mt-6" variants={staggerItem}>
          <PracticeTestResults sessions={data.recentSessions} />
        </motion.div>

        {data.fullSatAttempts.length > 0 && (
          <motion.div className="mt-6 border bg-card p-5" variants={staggerItem}>
            <h2 className="mb-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Full SAT Attempts
            </h2>
            <div className="space-y-3">
              {data.fullSatAttempts.map((attempt) => (
                <div
                  key={attempt.id}
                  className="flex items-center justify-between border-b border-border/40 py-2 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {attempt.completedAt
                        ? new Date(attempt.completedAt).toLocaleDateString()
                        : "Completed"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      R&amp;W {attempt.rwScaledScore ?? "—"} · Math{" "}
                      {attempt.mathScaledScore ?? "—"}
                    </p>
                  </div>
                  <span className="text-2xl font-bold tabular-nums">
                    {attempt.totalScore}
                  </span>
                </div>
              ))}
            </div>
            <Link
              href="/full-sat"
              className="mt-4 inline-block text-xs font-medium text-primary hover:underline"
            >
              Take another full SAT →
            </Link>
          </motion.div>
        )}

        <motion.div className="mt-6" variants={staggerItem}>
          <JourneyRanks currentScore={data.compositeScore} />
        </motion.div>
      </motion.div>
    </div>
  );
}
