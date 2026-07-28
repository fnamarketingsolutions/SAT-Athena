"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronLeft } from "lucide-react";
import { ProgressHeader } from "@/components/progress/progress-header";
import { MbeSubjectScores } from "@/components/progress/mbe-subject-scores";
import { SatSkills } from "@/components/progress/sat-skills";
import { OverallAccuracy } from "@/components/progress/overall-accuracy";
import { ScoreHistory } from "@/components/progress/score-history";
import { StudyStats } from "@/components/progress/study-stats";
import { TopicMastery } from "@/components/progress/topic-mastery";
import { PracticeTestResults } from "@/components/progress/practice-test-results";
import { StuckPointsPanel } from "@/components/analytics/stuck-points-panel";
import { EngagementPanel } from "@/components/analytics/engagement-panel";
import { ConsistencyPanel } from "@/components/analytics/consistency-panel";
import { PassProbabilityPanel } from "@/components/analytics/pass-probability-panel";
import type { StuckPoint, EngagementSummary } from "@/lib/db/queries/analytics";
import type { PassProbabilityResult } from "@/lib/pass-probability";
import { readPassTargetPercent } from "@/lib/pass-target";
import {
  averageSecondsPerQuestion,
  formatHistoryPace,
  getPaceStatus,
} from "@/lib/pacing";
import { cn } from "@/lib/utils";
import {
  APP_BRANDING,
  MOCK_EXAM_ROUTE,
  MOCK_EXAM_LABEL,
} from "@/lib/exam-config";

type AnalyticsData = {
  user: {
    displayName: string | null;
    avatarUrl: string | null;
    targetScore: number | null;
    skillScore: number | null;
    startAccuracy: number;
  };
  overallAccuracy: number;
  targetPercent: number;
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
    answeredCount: number;
    date: string;
  }[];
  overallStats: {
    totalQuestions: number;
    accuracy: number;
    totalTimeSeconds: number;
    sessionCount: number;
    avgScore: number;
  };
  subjectScores: {
    subject: string;
    label: string;
    shortLabel: string;
    total: number;
    correct: number;
    accuracy: number;
  }[];
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
  mbeMockAttempts: {
    id: string;
    correct: number;
    total: number;
    percentScore: number | null;
    passed: boolean;
    completedAt: string | null;
    totalTimeSeconds: number;
    answeredCount: number;
  }[];
  passProbability: PassProbabilityResult;
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
    queryKey: ["analytics-dashboard", "v3-mbe"],
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

  const recentResults = [
    ...data.recentSessions.map((s) => ({
      id: s.id,
      quizName:
        s.subtopicName === "Daily Practice" || s.subtopicName === "Daily Quest"
          ? "Daily Practice"
          : s.subtopicName || "Practice",
      score: s.score,
      totalQuestions: s.totalQuestions,
      timeElapsedSeconds: s.timeElapsedSeconds,
      date: s.date,
      avgSecondsPerQuestion: averageSecondsPerQuestion(
        s.timeElapsedSeconds,
        s.answeredCount
      ),
    })),
    ...data.mbeMockAttempts.map((a) => ({
      id: a.id,
      quizName: "Mock Exam",
      score: a.correct,
      totalQuestions: a.total,
      timeElapsedSeconds: a.totalTimeSeconds,
      date: a.completedAt ?? new Date(0).toISOString(),
      avgSecondsPerQuestion: averageSecondsPerQuestion(
        a.totalTimeSeconds,
        a.answeredCount
      ),
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);

  return (
    <AnalyticsDashboardBody data={data} recentResults={recentResults} />
  );
}

function AnalyticsDashboardBody({
  data,
  recentResults,
}: {
  data: AnalyticsData;
  recentResults: {
    id: string;
    quizName: string;
    score: number;
    totalQuestions: number;
    timeElapsedSeconds: number;
    date: string;
    avgSecondsPerQuestion?: number | null;
  }[];
}) {
  const [passTargetPercent, setPassTargetPercent] = useState(
    data.targetPercent
  );

  useEffect(() => {
    setPassTargetPercent(readPassTargetPercent(data.targetPercent));
  }, [data.targetPercent]);

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
            title={`Your ${APP_BRANDING.examLabel} Analytics`}
            subtitle="Accuracy by subject, weak areas, and study consistency"
          />
        </motion.div>

        <motion.div className="mt-8" variants={staggerItem}>
          <PassProbabilityPanel data={data.passProbability} />
        </motion.div>

        <motion.div variants={staggerItem}>
          <h2 className="mb-3 mt-8 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Bar Exam Subject Accuracy
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <motion.div className="grid gap-6 lg:col-span-3" variants={staggerItem}>
            <MbeSubjectScores
              subjects={data.subjectScores}
              targetPercent={passTargetPercent}
            />
            <OverallAccuracy
              accuracy={data.overallAccuracy}
              targetPercent={data.targetPercent}
              onTargetChange={setPassTargetPercent}
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
          <SatSkills topics={data.topicPerformance} title="Topic Performance" />
        </motion.div>

        <motion.div className="mt-6" variants={staggerItem}>
          <PracticeTestResults sessions={recentResults} />
        </motion.div>

        <motion.div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm" variants={staggerItem}>
          <h2 className="mb-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {MOCK_EXAM_LABEL}
          </h2>
          {data.mbeMockAttempts.length > 0 ? (
            <div className="space-y-3">
              {data.mbeMockAttempts.map((attempt) => {
                const avg = averageSecondsPerQuestion(
                  attempt.totalTimeSeconds,
                  attempt.answeredCount
                );
                const paceStatus = avg != null ? getPaceStatus(avg) : null;
                return (
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
                        {attempt.correct}/{attempt.total} correct
                        {attempt.passed ? " · Pass target met" : ""}
                      </p>
                      {avg != null && paceStatus && (
                        <p
                          className={cn(
                            "mt-0.5 text-sm font-semibold tabular-nums",
                            paceStatus === "good"
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-red-600 dark:text-red-400"
                          )}
                        >
                          {formatHistoryPace(avg)}
                        </p>
                      )}
                    </div>
                    <span className="text-2xl font-bold tabular-nums">
                      {attempt.percentScore != null
                        ? `${attempt.percentScore}%`
                        : "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No mock exam attempts yet. Generate a timed set across all seven
              MBE subjects.
            </p>
          )}
          <Link
            href={MOCK_EXAM_ROUTE}
            className="mt-4 inline-block text-xs font-medium text-primary hover:underline"
          >
            {data.mbeMockAttempts.length > 0
              ? `Take another ${MOCK_EXAM_LABEL} →`
              : `Start ${MOCK_EXAM_LABEL} →`}
          </Link>
        </motion.div>

      </motion.div>
    </div>
  );
}
