"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DAILY_PACE_PREF_KEY,
  formatPaceTime,
  getPaceZone,
  PACE_SECONDS_PER_QUESTION,
  type PaceZone,
} from "@/lib/pacing";

export function readDailyPacePreference(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(DAILY_PACE_PREF_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeDailyPacePreference(enabled: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DAILY_PACE_PREF_KEY, enabled ? "1" : "0");
  } catch {
    // private mode / blocked storage
  }
}

export function useDailyPacePreference() {
  const [enabled, setEnabledState] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setEnabledState(readDailyPacePreference());
    setHydrated(true);
  }, []);

  const setEnabled = useCallback((next: boolean) => {
    setEnabledState(next);
    writeDailyPacePreference(next);
  }, []);

  return { enabled, setEnabled, hydrated };
}

/**
 * Per-question countdown. Resets when `questionKey` changes.
 * After 0, continues into negative overtime while staying in alert zone.
 */
export function usePaceTimer(enabled: boolean, questionKey: string | number) {
  const [remaining, setRemaining] = useState(PACE_SECONDS_PER_QUESTION);

  useEffect(() => {
    if (!enabled) {
      setRemaining(PACE_SECONDS_PER_QUESTION);
      return;
    }
    setRemaining(PACE_SECONDS_PER_QUESTION);
    const id = window.setInterval(() => {
      setRemaining((r) => r - 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [enabled, questionKey]);

  const zone: PaceZone = getPaceZone(remaining);
  const display = formatPaceTime(remaining);

  return {
    remaining,
    display,
    zone,
    isOvertime: remaining < 0,
  };
}
