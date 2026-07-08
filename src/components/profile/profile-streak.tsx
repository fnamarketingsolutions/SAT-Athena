"use client";

import { QuestStreak } from "@/components/dashboard/quest-streak";

type StreakDay = {
  day: string;
  completed: boolean;
  isPast: boolean;
};

export function ProfileStreak({
  weeklyStreakDays,
}: {
  streak?: number;
  bestStreak?: number;
  weeklyStreakDays: StreakDay[];
}) {
  return <QuestStreak days={weeklyStreakDays} />;
}
