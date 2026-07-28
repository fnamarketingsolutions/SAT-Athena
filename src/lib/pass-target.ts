import { MBE_PASS_PERCENT } from "@/lib/exam-config";

export const PASS_TARGET_PERCENT_KEY = "athena-pass-target-percent";

export const MIN_PASS_TARGET_PERCENT = 50;
export const MAX_PASS_TARGET_PERCENT = 90;

export function clampPassTargetPercent(value: number): number {
  return Math.min(
    MAX_PASS_TARGET_PERCENT,
    Math.max(MIN_PASS_TARGET_PERCENT, Math.round(value))
  );
}

export function readPassTargetPercent(
  fallback: number = MBE_PASS_PERCENT
): number {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(PASS_TARGET_PERCENT_KEY);
    if (raw == null) return fallback;
    const n = Number(raw);
    if (!Number.isFinite(n)) return fallback;
    return clampPassTargetPercent(n);
  } catch {
    return fallback;
  }
}

export function writePassTargetPercent(value: number): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      PASS_TARGET_PERCENT_KEY,
      String(clampPassTargetPercent(value))
    );
  } catch {
    // ignore
  }
}

/** Allowed custom MBE scaled targets (personal preference). */
export const MIN_CUSTOM_MBE_TARGET = 100;
export const MAX_CUSTOM_MBE_TARGET = 180;

export function clampCustomMbeTarget(value: number): number {
  return Math.min(
    MAX_CUSTOM_MBE_TARGET,
    Math.max(MIN_CUSTOM_MBE_TARGET, Math.round(value))
  );
}
