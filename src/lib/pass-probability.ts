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
};

/** Default UBE-style cut score when the user has no personal target set. */
export const DEFAULT_UBE_TARGET = 270;

/** Map overall % correct onto the national MBE scaled range (40–200). */
export function accuracyToScaledMbe(accuracyPercent: number): number {
  const pct = Math.min(100, Math.max(0, accuracyPercent));
  return Math.round(40 + (pct / 100) * 160);
}

function resolveMbeTarget(ubeTarget: number | null | undefined): number {
  const cut =
    ubeTarget != null && ubeTarget > 0 ? ubeTarget : DEFAULT_UBE_TARGET;
  return Math.round(cut / 2);
}

function zoneFor(projectedMbe: number, mbeTarget: number): PerformanceZone {
  const delta = projectedMbe - mbeTarget;
  if (delta < -12) return "Below Range";
  if (delta < 0) return "Borderline Zone";
  if (delta < 12) return "On Track";
  return "Comfortable";
}

/** Logistic pass probability centered on the MBE target. */
function probabilityNearTarget(projectedMbe: number, mbeTarget: number): number {
  const z = (projectedMbe - mbeTarget) / 8;
  const p = 1 / (1 + Math.exp(-z));
  return Math.round(Math.min(99, Math.max(5, p * 100)));
}

/**
 * Blend latest full mock accuracy with ongoing practice accuracy into a
 * projected scaled MBE score and Pass Probability vs the user's target.
 */
export function computePassProbability(input: {
  targetScore?: number | null;
  practiceAccuracyPercent: number;
  latestMockAccuracyPercent: number | null;
}): PassProbabilityResult {
  const mbeTarget = resolveMbeTarget(input.targetScore);

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

  projectedMbe = Math.min(200, Math.max(40, projectedMbe));

  return {
    passProbability: probabilityNearTarget(projectedMbe, mbeTarget),
    projectedMbe,
    zone: zoneFor(projectedMbe, mbeTarget),
    mbeTarget,
    hasMockData,
    hasPracticeData,
    summarySource,
  };
}
