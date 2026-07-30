"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  ClipboardList,
  MessageCircle,
  Target,
} from "lucide-react";
import { DailyQuestHero } from "@/components/dashboard/daily-quest-hero";
import { ExamCountdownWidget } from "@/components/dashboard/exam-countdown-widget";
import { PaceStatusWidget } from "@/components/dashboard/pace-status-widget";
import { PassProbabilityPanel } from "@/components/analytics/pass-probability-panel";
import { ActivityHeatmap } from "@/components/profile/activity-heatmap";
import type { AccountabilityStatus } from "@/hooks/use-accountability-status";
import type { PassProbabilityResult } from "@/lib/pass-probability";
import type { StuckPoint } from "@/lib/db/queries/analytics";
import type { ActivityHeatmapDay } from "@/lib/db/queries/profile";
import { MOCK_EXAM_ROUTE } from "@/lib/exam-config";
import { cn } from "@/lib/utils";

type AnalyticsPayload = {
  passProbability: PassProbabilityResult;
  stuckPoints: StuckPoint[];
};

type ProfilePayload = {
  activityHeatmap: ActivityHeatmapDay[];
};

function WidgetShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "h-full min-h-[10rem] rounded-2xl border border-border bg-card text-left shadow-sm",
        className
      )}
    >
      {children}
    </div>
  );
}

function WeakAreasWidget({ points }: { points: StuckPoint[] }) {
  const top = points.slice(0, 3);

  return (
    <WidgetShell className="p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Weak areas
        </h2>
        <Link
          href="/analytics"
          className="text-xs font-medium text-primary hover:underline"
        >
          View all
        </Link>
      </div>

      {top.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          No weak spots yet. Complete a few practices to build your focus map.
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {top.map((point) => (
            <li
              key={point.subtopicId}
              className="border-b border-border/50 pb-3 last:border-0 last:pb-0"
            >
              <p className="truncate text-sm font-medium text-foreground">
                {point.subtopicName}
              </p>
              <p className="text-xs text-muted-foreground">
                {point.topicName} · {point.metrics.accuracy}% accuracy
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Link
                  href={`/learning/${point.topicSlug}/${point.subtopicSlug}/micro-lesson`}
                  className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                >
                  <BookOpen className="h-3 w-3" />
                  Learn
                </Link>
                <Link
                  href={`/learning/${point.topicSlug}/${point.subtopicSlug}/quiz`}
                  className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <Target className="h-3 w-3" />
                  Practice
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </WidgetShell>
  );
}

function QuickLinksWidget() {
  const links = [
    {
      href: "/quest",
      label: "Daily Practice",
      icon: Target,
      hint: "Today’s adaptive set",
    },
    {
      href: MOCK_EXAM_ROUTE,
      label: "Mock Exam",
      icon: ClipboardList,
      hint: "Full 100-question sim",
    },
    {
      href: "/learning",
      label: "Learning",
      icon: BookOpen,
      hint: "Lessons by subject",
    },
    {
      href: "/mentor",
      label: "Mentor",
      icon: MessageCircle,
      hint: "Guides + AI chat",
    },
  ] as const;

  return (
    <WidgetShell className="p-4 sm:p-5">
      <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        Jump back in
      </h2>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg border border-border bg-background px-3 py-2.5 transition-colors hover:border-primary/40 hover:bg-muted/40"
            >
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">
                  {link.label}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {link.hint}
              </p>
            </Link>
          );
        })}
      </div>
    </WidgetShell>
  );
}

function ReviewProgressCard() {
  return (
    <Link
      href="/analytics"
      className="flex h-full min-h-[10rem] items-center justify-between gap-3 rounded-2xl border border-border bg-card px-5 py-4 text-left shadow-sm transition hover:border-primary/40"
    >
      <div className="flex items-start gap-3">
        <BarChart3 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div>
          <p className="text-sm font-medium text-foreground">
            Review your progress
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Scores, subjects, and focus areas
          </p>
        </div>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}

export function DashboardCommandCenter({
  firstName,
  accountability,
  accountabilityLoading,
}: {
  firstName: string | null;
  accountability?: AccountabilityStatus;
  accountabilityLoading?: boolean;
}) {
  const { data: analytics, isLoading: analyticsLoading } =
    useQuery<AnalyticsPayload>({
      queryKey: ["analytics-dashboard"],
      queryFn: async () => {
        const res = await fetch("/api/analytics/dashboard");
        if (!res.ok) throw new Error("Failed to load analytics");
        return res.json();
      },
      staleTime: 60_000,
    });

  const { data: profile, isLoading: profileLoading } = useQuery<ProfilePayload>({
    queryKey: ["profile", "v4-focus"],
    queryFn: async () => {
      const res = await fetch("/api/profile");
      if (!res.ok) throw new Error("Failed to load profile");
      return res.json();
    },
    staleTime: 60_000,
  });

  return (
    <div className="mx-auto w-full max-w-6xl">
      <header className="mb-6 text-left sm:mb-8 sm:text-center">
        <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Welcome back
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-instrument-serif)] text-3xl font-normal tracking-tight text-foreground sm:text-4xl md:text-5xl">
          {firstName ? (
            <>
              <span className="italic text-muted-foreground">Hi, </span>
              {firstName}
            </>
          ) : (
            "Your study plan"
          )}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          Your bar exam command center — practice, pace, and focus in one view.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <DailyQuestHero
          status={accountability}
          isLoading={accountabilityLoading}
          embedded
        />

        <ExamCountdownWidget embedded />

        {/* Roughly twice the height of every other tile. Spanning two rows lets
            it sit alongside them instead of forcing one row tall enough to
            leave a hole under each of its neighbours. */}
        <div className="min-h-[10rem] sm:row-span-2">
          {analyticsLoading || !analytics ? (
            <div className="h-full min-h-[10rem] animate-pulse rounded-2xl border border-border bg-muted/60" />
          ) : (
            <PassProbabilityPanel data={analytics.passProbability} compact />
          )}
        </div>

        <PaceStatusWidget embedded />

        <div className="min-h-[10rem] overflow-hidden rounded-2xl">
          {profileLoading || !profile ? (
            <div className="h-full min-h-[10rem] animate-pulse rounded-2xl border border-border bg-muted/60" />
          ) : (
            <div className="h-full rounded-2xl border border-border bg-card shadow-sm [&_>div]:border-0 [&_>div]:p-4">
              <ActivityHeatmap days={profile.activityHeatmap} weeks={1} />
            </div>
          )}
        </div>

        <WeakAreasWidget points={analytics?.stuckPoints ?? []} />

        <ReviewProgressCard />
        <QuickLinksWidget />
      </div>
    </div>
  );
}