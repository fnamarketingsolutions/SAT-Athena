export type PerformanceZone =
  | "Below Range"
  | "Borderline Zone"
  | "On Track"
  | "Comfortable";

export type PassProbabilityResult = {
  passProbability: number;
  projectedMbe: number;
  zone: PerformanceZone;
  mbeTarget: number;
  hasMockData: boolean;
  hasPracticeData: boolean;
  summarySource: string;
  /** True only after ≥3 completed Daily Practices and ≥1 Full Mock Exam. */
  unlocked: boolean;
  completedDailyPractices: number;
  completedMockExams: number;
  requiredDailyPractices: number;
  requiredMockExams: number;
};

/** National MBE scaled benchmark when no target state is selected. */
export const NATIONAL_MBE_TARGET = 135;

/** Default UBE-style cut (= National Benchmark × 2). */
export const DEFAULT_UBE_TARGET = NATIONAL_MBE_TARGET * 2;

export const MAX_PROJECTED_MBE = 190;
export const MAX_PASS_PROBABILITY = 95;
export const MIN_PROJECTED_MBE = 40;
export const MIN_PASS_PROBABILITY = 5;

export const REQUIRED_DAILY_PRACTICES = 3;
export const REQUIRED_MOCK_EXAMS = 1;

/** Map overall % correct onto the national MBE scaled range (40–190 cap). */
export function accuracyToScaledMbe(accuracyPercent: number): number {
  const pct = Math.min(100, Math.max(0, accuracyPercent));
  // Map 0–100% onto 40–200, then clamp to product max of 190.
  const raw = Math.round(40 + (pct / 100) * 160);
  return Math.min(MAX_PROJECTED_MBE, Math.max(MIN_PROJECTED_MBE, raw));
}

/**
 * Inverse of `accuracyToScaledMbe`, for turning a scaled score a student
 * reports from elsewhere back into the accuracy the rest of the app stores.
 * Not a perfect round trip at the ends, since the forward map clamps.
 */
export function scaledMbeToAccuracy(scaledMbe: number): number {
  const scaled = Math.min(
    MAX_PROJECTED_MBE,
    Math.max(MIN_PROJECTED_MBE, scaledMbe)
  );
  return Math.round(((scaled - 40) / 160) * 100);
}

function resolveMbeTarget(ubeTarget: number | null | undefined): number {
  if (ubeTarget != null && ubeTarget > 0) {
    return Math.round(ubeTarget / 2);
  }
  return NATIONAL_MBE_TARGET;
}

function zoneFor(projectedMbe: number, mbeTarget: number): PerformanceZone {
  const delta = projectedMbe - mbeTarget;
  if (delta < -12) return "Below Range";
  if (delta < 0) return "Borderline Zone";
  if (delta < 12) return "On Track";
  return "Comfortable";
}

/**
 * Target-state status line: Below Range if under the cut, On Track once at/above.
 */
export function targetStateStatus(
  projectedMbe: number,
  mbeTarget: number
): "Below Range" | "On Track" {
  return projectedMbe >= mbeTarget ? "On Track" : "Below Range";
}

/** Logistic pass probability centered on the MBE target (capped at 95%). */
export function probabilityNearTarget(
  projectedMbe: number,
  mbeTarget: number
): number {
  const z = (projectedMbe - mbeTarget) / 8;
  const p = 1 / (1 + Math.exp(-z));
  return Math.round(
    Math.min(MAX_PASS_PROBABILITY, Math.max(MIN_PASS_PROBABILITY, p * 100))
  );
}

export function isPassProbabilityUnlocked(
  completedDailyPractices: number,
  completedMockExams: number
): boolean {
  return (
    completedDailyPractices >= REQUIRED_DAILY_PRACTICES &&
    completedMockExams >= REQUIRED_MOCK_EXAMS
  );
}

/**
 * Blend latest full mock accuracy with ongoing practice accuracy into a
 * projected scaled MBE score and Pass Probability vs the user's target.
 */
export function computePassProbability(input: {
  targetScore?: number | null;
  /** Direct MBE scaled target (overrides UBE total / 2 when set). */
  mbeTarget?: number | null;
  practiceAccuracyPercent: number;
  latestMockAccuracyPercent: number | null;
  completedDailyPractices?: number;
  completedMockExams?: number;
}): PassProbabilityResult {
  const completedDailyPractices = input.completedDailyPractices ?? 0;
  const completedMockExams = input.completedMockExams ?? 0;
  const unlocked = isPassProbabilityUnlocked(
    completedDailyPractices,
    completedMockExams
  );

  const mbeTarget =
    input.mbeTarget != null && input.mbeTarget > 0
      ? Math.round(input.mbeTarget)
      : resolveMbeTarget(input.targetScore);

  const hasPracticeData = input.practiceAccuracyPercent > 0;
  const hasMockData =
    input.latestMockAccuracyPercent != null &&
    input.latestMockAccuracyPercent > 0;

  let projectedMbe: number;
  let summarySource: string;

  if (hasMockData && hasPracticeData) {
    const mockMbe = accuracyToScaledMbe(input.latestMockAccuracyPercent!);
    const practiceMbe = accuracyToScaledMbe(input.practiceAccuracyPercent);
    projectedMbe = Math.round(mockMbe * 0.65 + practiceMbe * 0.35);
    summarySource =
      "Based on your latest Full Mock Exam & practice history.";
  } else if (hasMockData) {
    projectedMbe = accuracyToScaledMbe(input.latestMockAccuracyPercent!);
    summarySource = "Based on your latest Full Mock Exam.";
  } else if (hasPracticeData) {
    projectedMbe = accuracyToScaledMbe(input.practiceAccuracyPercent);
    summarySource =
      "Based on your practice history. Take a full mock for a sharper estimate.";
  } else {
    projectedMbe = accuracyToScaledMbe(50);
    summarySource =
      "Complete practice or a full mock exam to personalize this estimate.";
  }

  projectedMbe = Math.min(
    MAX_PROJECTED_MBE,
    Math.max(MIN_PROJECTED_MBE, projectedMbe)
  );

  return {
    passProbability: probabilityNearTarget(projectedMbe, mbeTarget),
    projectedMbe,
    zone: zoneFor(projectedMbe, mbeTarget),
    mbeTarget,
    hasMockData,
    hasPracticeData,
    summarySource,
    unlocked,
    completedDailyPractices,
    completedMockExams,
    requiredDailyPractices: REQUIRED_DAILY_PRACTICES,
    requiredMockExams: REQUIRED_MOCK_EXAMS,
  };
}
