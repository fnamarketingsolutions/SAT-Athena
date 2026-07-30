import { describe, expect, it } from "vitest";
import {
  accuracyToComposite,
  DIAGNOSTIC_QUESTION_COUNT,
  selectDiagnosticSpread,
} from "@/lib/onboarding-diagnostic";
import {
  accuracyToScaledMbe,
  scaledMbeToAccuracy,
} from "@/lib/pass-probability";
import {
  MAX_UBE_TOTAL,
  MIN_UBE_TOTAL,
  mbeFromUbeTotal,
  ubeTargetFromMbe,
} from "@/lib/target-states";

/** Seven subjects sized like the real library, easiest problem first. */
function libraryLikeProduction(): string[][] {
  const sizes: Record<string, number> = {
    civ: 61,
    con: 51,
    ctr: 34,
    crm: 34,
    evi: 54,
    rea: 50,
    tor: 54,
  };
  return Object.entries(sizes).map(([subject, size]) =>
    Array.from({ length: size }, (_, i) => `${subject}-${i}`)
  );
}

function subjectOf(id: string) {
  return id.split("-")[0];
}

describe("selectDiagnosticSpread", () => {
  it("returns a full diagnostic from a production-sized library", () => {
    const picked = selectDiagnosticSpread(
      libraryLikeProduction(),
      DIAGNOSTIC_QUESTION_COUNT
    );

    expect(picked).toHaveLength(DIAGNOSTIC_QUESTION_COUNT);
    expect(new Set(picked).size).toBe(DIAGNOSTIC_QUESTION_COUNT);
  });

  it("covers every subject before repeating one", () => {
    const picked = selectDiagnosticSpread(
      libraryLikeProduction(),
      DIAGNOSTIC_QUESTION_COUNT
    );
    const firstSeven = picked.slice(0, 7).map(subjectOf);

    expect(new Set(firstSeven).size).toBe(7);
  });

  it("never takes more than two questions from one subject", () => {
    const picked = selectDiagnosticSpread(
      libraryLikeProduction(),
      DIAGNOSTIC_QUESTION_COUNT
    );

    const perSubject = new Map<string, number>();
    for (const id of picked) {
      const subject = subjectOf(id);
      perSubject.set(subject, (perSubject.get(subject) ?? 0) + 1);
    }

    expect(Math.max(...perSubject.values())).toBeLessThanOrEqual(2);
  });

  it("strides through each subject instead of taking only its easiest", () => {
    // Two picks from a 61-problem subject should come from opposite halves of
    // the difficulty-ordered list, not be items 0 and 1.
    const picked = selectDiagnosticSpread(
      libraryLikeProduction(),
      DIAGNOSTIC_QUESTION_COUNT
    );
    const civIndexes = picked
      .filter((id) => subjectOf(id) === "civ")
      .map((id) => Number(id.split("-")[1]));

    expect(civIndexes).toHaveLength(2);
    expect(civIndexes[1] - civIndexes[0]).toBeGreaterThan(10);
  });

  it("tops up from other subjects when one runs dry", () => {
    // Seven subjects but almost nothing in them: six have a single problem.
    const sparse = [["a-0", "a-1", "a-2", "a-3", "a-4", "a-5", "a-6"]].concat(
      ["b", "c", "d", "e", "f", "g"].map((s) => [`${s}-0`])
    );

    const picked = selectDiagnosticSpread(sparse, DIAGNOSTIC_QUESTION_COUNT);

    expect(picked).toHaveLength(DIAGNOSTIC_QUESTION_COUNT);
    expect(new Set(picked).size).toBe(DIAGNOSTIC_QUESTION_COUNT);
  });

  it("returns everything available when the library is smaller than the quota", () => {
    const tiny = [["a-0"], ["b-0"]];

    expect(selectDiagnosticSpread(tiny, DIAGNOSTIC_QUESTION_COUNT)).toEqual([
      "a-0",
      "b-0",
    ]);
  });

  it("ignores subjects with no problems", () => {
    const picked = selectDiagnosticSpread([[], ["b-0"], []], 5);

    expect(picked).toEqual(["b-0"]);
  });

  it("handles an empty library without throwing", () => {
    expect(selectDiagnosticSpread([], 12)).toEqual([]);
    expect(selectDiagnosticSpread([[], []], 12)).toEqual([]);
  });
});

describe("accuracyToComposite", () => {
  it("round-trips through the analytics baseline formula", () => {
    // `baselineAccuracy` in analytics-dashboard.ts reads composite back as
    // `composite / 16`, so the two have to agree.
    for (const accuracy of [0, 25, 50, 67, 83, 100]) {
      expect(Math.round(accuracyToComposite(accuracy) / 16)).toBe(accuracy);
    }
  });

  it("clamps out-of-range accuracy", () => {
    expect(accuracyToComposite(-10)).toBe(0);
    expect(accuracyToComposite(140)).toBe(1600);
  });

  it("stays inside the range the adaptive difficulty floor expects", () => {
    // computeGlobalFloor() buckets on 900 / 1100 / 1300 out of 1600.
    expect(accuracyToComposite(100)).toBeLessThanOrEqual(1600);
    expect(accuracyToComposite(0)).toBeGreaterThanOrEqual(0);
  });
});

describe("scaledMbeToAccuracy", () => {
  it("inverts accuracyToScaledMbe across the unclamped range", () => {
    for (const accuracy of [0, 20, 40, 60, 80]) {
      const scaled = accuracyToScaledMbe(accuracy);
      expect(scaledMbeToAccuracy(scaled)).toBe(accuracy);
    }
  });

  it("clamps scores outside the reportable MBE range", () => {
    expect(scaledMbeToAccuracy(0)).toBe(0);
    expect(scaledMbeToAccuracy(500)).toBe(scaledMbeToAccuracy(190));
  });
});

describe("self-reported bar score", () => {
  it("keeps the 200-400 total and its MBE half in step", () => {
    for (const total of [200, 240, 270, 300, 400]) {
      expect(ubeTargetFromMbe(mbeFromUbeTotal(total))).toBe(total);
    }
  });

  it("holds the scale the onboarding slider offers", () => {
    // The wizard renders MIN_UBE_TOTAL..MAX_UBE_TOTAL, so a bar student never
    // sees the SAT 200-800 section range these fields used to carry.
    expect([MIN_UBE_TOTAL, MAX_UBE_TOTAL]).toEqual([200, 400]);
  });

  it("turns a reported total into an accuracy the app can store", () => {
    const composite = (total: number) =>
      accuracyToComposite(scaledMbeToAccuracy(mbeFromUbeTotal(total)));

    // A passing-range score must land above a clearly failing one, and both
    // must stay inside the 0-1600 band the adaptive engine reads.
    expect(composite(270)).toBeGreaterThan(composite(220));
    expect(composite(400)).toBeLessThanOrEqual(1600);
    expect(composite(200)).toBeGreaterThanOrEqual(0);
  });
});
