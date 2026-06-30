"use client";

import { useQuery } from "@tanstack/react-query";

export type AccountabilityStatus = {
  enabled: boolean;
  locked: boolean;
  quest: {
    id: string;
    status: string;
    totalQuestions: number;
    correctCount: number;
    xpEarned: number;
    answeredCount: number;
  } | null;
  streak: number;
};

export function useAccountabilityStatus() {
  return useQuery<AccountabilityStatus>({
    queryKey: ["accountability-status"],
    queryFn: async () => {
      const res = await fetch("/api/accountability/status");
      if (!res.ok) throw new Error("Failed to load accountability status");
      return res.json();
    },
    staleTime: 30_000,
  });
}
