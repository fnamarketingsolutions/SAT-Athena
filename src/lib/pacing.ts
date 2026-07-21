/** Official MBE pacing: 1 minute 48 seconds per question. */
export const PACE_SECONDS_PER_QUESTION = 108;

/** Remaining seconds inclusive bounds for color zones. */
export const PACE_SAFE_MIN = 54; // 108 → 54 green
export const PACE_WARN_MIN = 16; // 53 → 16 orange
// 15 → 0 (and overtime) = red

export type PaceZone = "safe" | "warn" | "alert";

export type PaceStatus = "good" | "slow";

export function getPaceZone(remainingSeconds: number): PaceZone {
  if (remainingSeconds >= PACE_SAFE_MIN) return "safe";
  if (remainingSeconds >= PACE_WARN_MIN) return "warn";
  return "alert";
}

/** Format 108 → "1:48", 0 → "0:00", -5 → "-0:05". */
export function formatPaceTime(remainingSeconds: number): string {
  const overtime = remainingSeconds < 0;
  const abs = Math.abs(remainingSeconds);
  const m = Math.floor(abs / 60);
  const s = abs % 60;
  const body = `${m}:${s.toString().padStart(2, "0")}`;
  return overtime ? `-${body}` : body;
}

/** Average seconds per answered question from total session time. */
export function averageSecondsPerQuestion(
  totalSeconds: number,
  answeredCount: number
): number | null {
  if (answeredCount <= 0 || !Number.isFinite(totalSeconds) || totalSeconds < 0) {
    return null;
  }
  return totalSeconds / answeredCount;
}

export function getPaceStatus(avgSecondsPerQuestion: number): PaceStatus {
  return avgSecondsPerQuestion <= PACE_SECONDS_PER_QUESTION ? "good" : "slow";
}

/** Format average like "1:32 / q". */
export function formatAveragePace(avgSeconds: number): string {
  const rounded = Math.max(0, Math.round(avgSeconds));
  return `${formatPaceTime(rounded)} / q`;
}

/** History list format: "1m 24s / Q". */
export function formatHistoryPace(avgSeconds: number): string {
  const rounded = Math.max(0, Math.round(avgSeconds));
  const m = Math.floor(rounded / 60);
  const s = rounded % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s / Q`;
}

export const DAILY_PACE_PREF_KEY = "athena-daily-pace-enabled";
export const PACE_PRACTICE_HREF = "/quest?pace=1";
