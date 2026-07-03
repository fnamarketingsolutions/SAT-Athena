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
import { ProfileStreak } from "@/components/profile/profile-streak";
import { MbeMockScore } from "@/components/profile/mbe-mock-score";
import { ScheduleEditor } from "@/components/profile/schedule-editor";
import { APP_BRANDING, MBE_PASS_PERCENT } from "@/lib/exam-config";

type TierInfo = {
  name: string;
  threshold: number;
  description: string;
  emoji: string;
  active: boolean;
};

type MockAttempt = {
  id: string;
  correct: number;
  total: number;
  percentScore: number | null;
  passed: boolean;
  completedAt: string | null;
};

type StreakDay = {
  day: string;
  completed: boolean;
  isPast: boolean;
};

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
    bestStreak: number;
  } | null;
  overallAccuracy: number;
  targetPercent: number;
  questsDone: number;
  totalTimeSeconds: number;
  accuracy: number;
  streak: number;
  bestStreak: number;
  subjectScores: SubjectScore[];
  latestMockAttempt: MockAttempt | null;
  weeklyStreakDays: StreakDay[];
  rank: {
    current: { name: string; description: string; emoji: string; threshold: number };
    next: { name: string; description: string; emoji: string; threshold: number } | null;
    pct: number;
    pointsToNext: number;
  };
  tiers: TierInfo[];
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
    queryKey: ["profile", "v3-mbe"],
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
        <div className="h-8 w-48 bg-muted animate-pulse" />
        <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_280px]">
          <div className="space-y-8">
            <div className="h-20 bg-muted animate-pulse" />
            <div className="h-px bg-border" />
            <div className="grid grid-cols-2 gap-x-16 gap-y-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-14 bg-muted animate-pulse" />
              ))}
            </div>
            <div className="h-px bg-border" />
            <div className="h-20 bg-muted animate-pulse" />
          </div>
          <div className="space-y-6">
            <div className="h-20 bg-muted animate-pulse" />
            <div className="h-64 bg-muted animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!data || !data.user) return null;

  const {
    user,
    overallAccuracy,
    targetPercent,
    questsDone,
    totalTimeSeconds,
    accuracy,
    rank,
    tiers,
    subjectScores,
  } = data;
  const bestStreak = Math.max(data.bestStreak, data.streak);
  const practicedSubjects = subjectScores.filter((s) => s.total > 0);

  return (
    <div className="relative z-10 p-6">
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
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
          >
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
                <p className="text-sm text-muted-foreground">
                  {rank.current.emoji} {rank.current.name} — {rank.current.description}
                </p>
              </div>
            </motion.div>

            <div className="my-8 border-b" />

            <motion.div variants={staggerItem}>
              <div className="grid grid-cols-2 gap-x-16 gap-y-8">
                <div>
                  <p className="text-2xl font-bold">{questsDone}</p>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Quests Done
                  </p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatTime(totalTimeSeconds)}</p>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Total Time
                  </p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{bestStreak} days</p>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Best Streak
                  </p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{accuracy}%</p>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Bar Exam Accuracy
                  </p>
                </div>
              </div>
            </motion.div>

            <div className="my-8 border-b" />

            {practicedSubjects.length > 0 && (
              <>
                <motion.div variants={staggerItem}>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Subject Accuracy
                  </h3>
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {practicedSubjects.map((s) => (
                      <div key={s.subject} className="border bg-card p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {s.shortLabel}
                        </p>
                        <p className="mt-1 text-xl font-bold tabular-nums">
                          {s.accuracy}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {s.correct}/{s.total}
                        </p>
                      </div>
                    ))}
                  </div>
                </motion.div>
                <div className="my-8 border-b" />
              </>
            )}

            <motion.div variants={staggerItem}>
              <Link
                href="/analytics"
                className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                View full {APP_BRANDING.examLabel} analytics
                <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>

            <div className="my-8 border-b" />

            <motion.div variants={staggerItem}>
              <ProfileStreak
                streak={data.streak}
                bestStreak={bestStreak}
                weeklyStreakDays={data.weeklyStreakDays}
              />
            </motion.div>

            <div className="my-8 border-b" />

            <motion.div variants={staggerItem}>
              <MbeMockScore latestAttempt={data.latestMockAttempt} />
            </motion.div>

            <div className="my-8 border-b" />

            <motion.div variants={staggerItem}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Progress to Pass Target
              </h3>
              <div className="mt-4 flex items-baseline justify-between">
                <span className="text-2xl font-bold">{targetPercent}%</span>
                <span className="text-sm text-muted-foreground">
                  Currently {overallAccuracy}%
                </span>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden bg-muted">
                <motion.div
                  className="h-full bg-foreground"
                  initial={{ width: 0 }}
                  animate={{
                    width: `${Math.min(
                      Math.round((overallAccuracy / targetPercent) * 100),
                      100
                    )}%`,
                  }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
              {rank.next && (
                <p className="mt-2 text-sm text-muted-foreground">
                  {rank.pointsToNext}% to {rank.next.name} ({rank.next.threshold}%)
                </p>
              )}
              {overallAccuracy >= MBE_PASS_PERCENT && (
                <p className="mt-2 text-sm text-green-600">
                  You&apos;ve reached the {MBE_PASS_PERCENT}% bar exam pass benchmark.
                </p>
              )}
            </motion.div>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
          >
            <motion.div variants={staggerItem}>
              <ScheduleEditor />
            </motion.div>

            <motion.div
              variants={staggerItem}
              className="mt-4 border bg-card p-4"
            >
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Current Tier
              </h3>
              <div className="mt-3 flex items-center gap-3">
                <span className="text-2xl">{rank.current.emoji}</span>
                <div>
                  <p className="font-semibold">{rank.current.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {rank.current.description}
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              variants={staggerItem}
              className="mt-4 border bg-card p-4"
            >
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                All Tiers
              </h3>
              <div className="mt-3 space-y-1">
                {tiers.map((tier) => (
                  <div
                    key={tier.name}
                    className={`flex items-center gap-2.5 py-1.5 text-sm ${
                      tier.active
                        ? "text-foreground font-medium"
                        : "text-muted-foreground/50"
                    }`}
                  >
                    <span className="text-base">{tier.emoji}</span>
                    <span className="flex-1">{tier.name}</span>
                    <span className="tabular-nums">{tier.threshold}%</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>

        <motion.div variants={staggerItem} className="mt-10">
          <div className="flex gap-6 overflow-x-auto pb-2">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className={`flex shrink-0 flex-col items-center gap-1 ${
                  tier.active ? "opacity-100" : "opacity-30"
                }`}
              >
                <span className="text-2xl">{tier.emoji}</span>
                <span className="text-[10px] text-muted-foreground">{tier.name}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
