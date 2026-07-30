/**
 * Bar-exam target states with an MBE-scaled cut (approx. half of a UBE total,
 * or the published MBE-equivalent target for non-UBE jurisdictions).
 *
 * Used by Pass Probability → Target State selector.
 */
export type TargetState = {
  code: string;
  name: string;
  /** Short label shown in the projected-MBE line, e.g. "NY Bar". */
  barLabel: string;
  /** Scaled MBE target on the 40–200 range. */
  mbeTarget: number;
};

export const TARGET_STATE_STORAGE_KEY = "athena-target-state";

export const TARGET_STATES: TargetState[] = [
  { code: "AL", name: "Alabama", barLabel: "AL Bar", mbeTarget: 130 },
  { code: "AK", name: "Alaska", barLabel: "AK Bar", mbeTarget: 140 },
  { code: "AZ", name: "Arizona", barLabel: "AZ Bar", mbeTarget: 136 },
  { code: "AR", name: "Arkansas", barLabel: "AR Bar", mbeTarget: 135 },
  { code: "CA", name: "California", barLabel: "CA Bar", mbeTarget: 140 },
  { code: "CO", name: "Colorado", barLabel: "CO Bar", mbeTarget: 138 },
  { code: "CT", name: "Connecticut", barLabel: "CT Bar", mbeTarget: 133 },
  { code: "DE", name: "Delaware", barLabel: "DE Bar", mbeTarget: 135 },
  { code: "DC", name: "District of Columbia", barLabel: "DC Bar", mbeTarget: 133 },
  { code: "FL", name: "Florida", barLabel: "FL Bar", mbeTarget: 136 },
  { code: "GA", name: "Georgia", barLabel: "GA Bar", mbeTarget: 135 },
  { code: "HI", name: "Hawaii", barLabel: "HI Bar", mbeTarget: 134 },
  { code: "ID", name: "Idaho", barLabel: "ID Bar", mbeTarget: 136 },
  { code: "IL", name: "Illinois", barLabel: "IL Bar", mbeTarget: 133 },
  { code: "IN", name: "Indiana", barLabel: "IN Bar", mbeTarget: 132 },
  { code: "IA", name: "Iowa", barLabel: "IA Bar", mbeTarget: 133 },
  { code: "KS", name: "Kansas", barLabel: "KS Bar", mbeTarget: 133 },
  { code: "KY", name: "Kentucky", barLabel: "KY Bar", mbeTarget: 133 },
  { code: "LA", name: "Louisiana", barLabel: "LA Bar", mbeTarget: 135 },
  { code: "ME", name: "Maine", barLabel: "ME Bar", mbeTarget: 134 },
  { code: "MD", name: "Maryland", barLabel: "MD Bar", mbeTarget: 133 },
  { code: "MA", name: "Massachusetts", barLabel: "MA Bar", mbeTarget: 135 },
  { code: "MI", name: "Michigan", barLabel: "MI Bar", mbeTarget: 135 },
  { code: "MN", name: "Minnesota", barLabel: "MN Bar", mbeTarget: 130 },
  { code: "MO", name: "Missouri", barLabel: "MO Bar", mbeTarget: 130 },
  { code: "MT", name: "Montana", barLabel: "MT Bar", mbeTarget: 133 },
  { code: "NE", name: "Nebraska", barLabel: "NE Bar", mbeTarget: 135 },
  { code: "NV", name: "Nevada", barLabel: "NV Bar", mbeTarget: 139 },
  { code: "NH", name: "New Hampshire", barLabel: "NH Bar", mbeTarget: 135 },
  { code: "NJ", name: "New Jersey", barLabel: "NJ Bar", mbeTarget: 133 },
  { code: "NM", name: "New Mexico", barLabel: "NM Bar", mbeTarget: 133 },
  { code: "NY", name: "New York", barLabel: "NY Bar", mbeTarget: 135 },
  { code: "NC", name: "North Carolina", barLabel: "NC Bar", mbeTarget: 135 },
  { code: "ND", name: "North Dakota", barLabel: "ND Bar", mbeTarget: 130 },
  { code: "OH", name: "Ohio", barLabel: "OH Bar", mbeTarget: 135 },
  { code: "OK", name: "Oklahoma", barLabel: "OK Bar", mbeTarget: 132 },
  { code: "OR", name: "Oregon", barLabel: "OR Bar", mbeTarget: 135 },
  { code: "PA", name: "Pennsylvania", barLabel: "PA Bar", mbeTarget: 136 },
  { code: "RI", name: "Rhode Island", barLabel: "RI Bar", mbeTarget: 135 },
  { code: "SC", name: "South Carolina", barLabel: "SC Bar", mbeTarget: 133 },
  { code: "SD", name: "South Dakota", barLabel: "SD Bar", mbeTarget: 130 },
  { code: "TN", name: "Tennessee", barLabel: "TN Bar", mbeTarget: 135 },
  { code: "TX", name: "Texas", barLabel: "TX Bar", mbeTarget: 135 },
  { code: "UT", name: "Utah", barLabel: "UT Bar", mbeTarget: 135 },
  { code: "VT", name: "Vermont", barLabel: "VT Bar", mbeTarget: 135 },
  { code: "VA", name: "Virginia", barLabel: "VA Bar", mbeTarget: 140 },
  { code: "WA", name: "Washington", barLabel: "WA Bar", mbeTarget: 135 },
  { code: "WV", name: "West Virginia", barLabel: "WV Bar", mbeTarget: 135 },
  { code: "WI", name: "Wisconsin", barLabel: "WI Bar", mbeTarget: 135 },
  { code: "WY", name: "Wyoming", barLabel: "WY Bar", mbeTarget: 135 },
];

const BY_CODE = new Map(TARGET_STATES.map((s) => [s.code, s]));

export function getTargetState(code: string | null | undefined): TargetState | null {
  if (!code) return null;
  return BY_CODE.get(code.toUpperCase()) ?? null;
}

/** Bounds of the UBE-style total score stored in profile `target_score`. */
export const MIN_UBE_TOTAL = 200;
export const MAX_UBE_TOTAL = 400;

/** UBE-style total used by profile `target_score` (MBE × 2). */
export function ubeTargetFromMbe(mbeTarget: number): number {
  return Math.min(
    MAX_UBE_TOTAL,
    Math.max(MIN_UBE_TOTAL, Math.round(mbeTarget * 2))
  );
}

/** Inverse of `ubeTargetFromMbe`: the MBE half of a UBE-style total. */
export function mbeFromUbeTotal(ubeTotal: number): number {
  const total = Math.min(
    MAX_UBE_TOTAL,
    Math.max(MIN_UBE_TOTAL, Math.round(ubeTotal))
  );
  return Math.round(total / 2);
}

export function readStoredTargetStateCode(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(TARGET_STATE_STORAGE_KEY);
    return raw && BY_CODE.has(raw.toUpperCase()) ? raw.toUpperCase() : null;
  } catch {
    return null;
  }
}

export function writeStoredTargetStateCode(code: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (!code) localStorage.removeItem(TARGET_STATE_STORAGE_KEY);
    else localStorage.setItem(TARGET_STATE_STORAGE_KEY, code.toUpperCase());
  } catch {
    // ignore quota / private mode
  }
}
