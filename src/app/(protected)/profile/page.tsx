"use client";

import { useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { AnimatedSprite } from "@/components/pixel-art/animated-sprite";
import { ProfileNameEditor } from "@/components/profile/profile-name-editor";
import { ScheduleEditor } from "@/components/profile/schedule-editor";
import { ActivityHeatmap } from "@/components/profile/activity-heatmap";
import { TopicProgressPanel } from "@/components/profile/topic-progress-panel";
import { PassProbabilityPanel } from "@/components/analytics/pass-probability-panel";
import { APP_BRANDING } from "@/lib/exam-config";
import type { PassProbabilityResult } from "@/lib/pass-probability";
import type { ActivityHeatmapDay } from "@/lib/db/queries/profile";

type SubjectScore = {
  subject: string;
  label: string;
  shortLabel: string;
  total: number;
  correct: number;
  accuracy: number;
};

type ProfileData = {
  user: {
    displayName: string | null;
    avatarUrl: string | null;
    createdAt: string;
    targetScore: number | null;
  } | null;
  overallAccuracy: number;
  targetPercent: number;
  sessionsCompleted: number;
  totalTimeSeconds: number;
  accuracy: number;
  subjectScores: SubjectScore[];
  activityHeatmap: ActivityHeatmapDay[];
  passProbability: PassProbabilityResult;
};

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ProfilePage() {
  const { data: userData, loading: userLoading } = useCurrentUser();
  const readyToLoad = !userLoading && !!userData;

  const {
    data,
    isLoading: profileLoading,
    isError,
  } = useQuery<ProfileData>({
    queryKey: ["profile", "v4-focus"],
    queryFn: () =>
      fetch("/api/profile").then((r) => {
        if (!r.ok) throw new Error("Failed to load");
        return r.json();
      }),
    staleTime: 2 * 60_000,
    enabled: readyToLoad,
  });

  useEffect(() => {
    if (isError) toast.error("Failed to load profile data");
  }, [isError]);

  const loading = userLoading || profileLoading;

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <div className="h-8 w-48 animate-pulse bg-muted" />
        <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_280px]">
          <div className="space-y-8">
            <div className="h-20 animate-pulse bg-muted" />
            <div className="h-40 animate-pulse bg-muted" />
          </div>
          <div className="h-64 animate-pulse bg-muted" />
        </div>
      </div>
    );
  }

  if (!data || !data.user) return null;

  const {
    user,
    sessionsCompleted,
    totalTimeSeconds,
    accuracy,
    subjectScores,
    activityHeatmap,
    passProbability,
    targetPercent,
  } = data;

  return (
    <div className="relative z-10 p-6 pb-16">
      <motion.div
        className="mx-auto max-w-5xl"
        variants={staggerContainer}
        initial="hidden"
        animate="show"
      >
        <motion.h1
          variants={staggerItem}
          className="mb-8 text-2xl font-bold tracking-tight"
        >
          Bar Exam Profile
        </motion.h1>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_280px]">
          <div>
            <motion.div variants={staggerItem} className="flex items-start gap-4">
              <AnimatedSprite
                src="/images/pixel-art/profile-avatar.png"
                alt="Avatar"
                width={64}
                height={64}
              />
              <div className="min-w-0 flex-1">
                <ProfileNameEditor displayName={user.displayName} />
                <p className="text-sm text-muted-foreground">
                  Prep started {formatDate(user.createdAt)}
                </p>
              </div>
            </motion.div>

            <div className="my-8 border-b" />

            <motion.div variants={staggerItem}>
              <div className="grid grid-cols-2 gap-x-16 gap-y-8 sm:grid-cols-3">
                <div>
                  <p className="text-2xl font-bold">{sessionsCompleted}</p>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Sessions
                  </p>
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {formatTime(totalTimeSeconds)}
                  </p>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Total Time
                  </p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{accuracy}%</p>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Accuracy
                  </p>
                </div>
              </div>
            </motion.div>

            <div className="my-8 border-b" />

            <motion.div variants={staggerItem}>
              <PassProbabilityPanel data={passProbability} compact />
            </motion.div>

            <div className="my-8 border-b" />

            <motion.div variants={staggerItem}>
              <ActivityHeatmap days={activityHeatmap} weeks={12} />
            </motion.div>

            <div className="my-8 border-b" />

            <motion.div variants={staggerItem}>
              <TopicProgressPanel
                subjects={subjectScores}
                targetPercent={targetPercent}
              />
            </motion.div>

            <motion.div variants={staggerItem} className="mt-8">
              <Link
                href="/analytics"
                className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                View full {APP_BRANDING.examLabel} analytics
                <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>
          </div>

          <motion.div variants={staggerContainer} initial="hidden" animate="show">
            <motion.div variants={staggerItem}>
              <ScheduleEditor />
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
