export const APP_BRANDING = {
  title: "Athena — Bar Exam Preparation",
  description:
    "AI-powered bar exam preparation with adaptive tutoring, multiple-choice practice, and structured accountability.",
  shortName: "Athena Bar Prep",
  examLabel: "Bar Exam",
  heroTagline: "BAR EXAM AI COACH",
  heroTitle: "Your personal bar exam coach,",
  heroSubtitle:
    "Adaptive multiple-choice practice, AI tutoring, voice mentor, and progress tracking — built for students preparing for the bar exam.",
  copyright:
    "Athena. Not affiliated with the National Conference of Bar Examiners (NCBE).",
} as const;

/** Seven MBE-tested subjects (Multistate Bar Examination). */
export const MBE_SUBJECTS = [
  { key: "civil-procedure", label: "Civil Procedure", shortLabel: "Civ Pro" },
  { key: "constitutional-law", label: "Constitutional Law", shortLabel: "Con Law" },
  { key: "contracts", label: "Contracts", shortLabel: "Contracts" },
  { key: "criminal-law", label: "Criminal Law & Procedure", shortLabel: "Crim Law" },
  { key: "evidence", label: "Evidence", shortLabel: "Evidence" },
  { key: "real-property", label: "Real Property", shortLabel: "Property" },
  { key: "torts", label: "Torts", shortLabel: "Torts" },
] as const;

export type MbeSubject = (typeof MBE_SUBJECTS)[number]["key"];

/** @deprecated Use MbeSubject — kept for gradual migration from SAT types. */
export type CurriculumSubject = MbeSubject;

export const MBE_PASS_PERCENT = 65;

/** Progress ranks based on overall MBE practice accuracy (%). */
export const MBE_RANKS = [
  { name: "1L", threshold: 0, emoji: "📚", description: "Building fundamentals" },
  { name: "Bar Taker", threshold: 45, emoji: "⚖️", description: "Core concepts in progress" },
  { name: "Competitor", threshold: 55, emoji: "🎯", description: "Approaching exam readiness" },
  { name: "Pass Ready", threshold: 65, emoji: "✅", description: "At the bar exam pass benchmark" },
  { name: "Strong", threshold: 75, emoji: "💪", description: "Solid across subjects" },
  { name: "Expert", threshold: 85, emoji: "🏆", description: "High-confidence performer" },
  { name: "Master", threshold: 95, emoji: "👑", description: "Elite bar exam prep" },
] as const;

export type MbeRank = (typeof MBE_RANKS)[number];

export function getMbeRank(accuracy: number): MbeRank {
  for (let i = MBE_RANKS.length - 1; i >= 0; i--) {
    if (accuracy >= MBE_RANKS[i].threshold) return MBE_RANKS[i];
  }
  return MBE_RANKS[0];
}

export function getMbeRankProgress(accuracy: number) {
  const current = getMbeRank(accuracy);
  const idx = MBE_RANKS.findIndex((r) => r.name === current.name);
  const next = idx < MBE_RANKS.length - 1 ? MBE_RANKS[idx + 1] : null;

  if (!next) {
    return { current, next: null, pct: 100, pointsToNext: 0 };
  }

  const range = next.threshold - current.threshold;
  const progress = accuracy - current.threshold;
  const pct = Math.min(Math.round((progress / range) * 100), 100);

  return {
    current,
    next,
    pct,
    pointsToNext: next.threshold - accuracy,
  };
}

/** User-facing label for the full-length mock bar exam practice module. */
export const MOCK_EXAM_LABEL = "Mock Bar Exam Practice";
export const MOCK_EXAM_DESCRIPTION =
  "Take a timed multiple-choice practice set across all seven bar exam subjects.";

/** App routes for MBE mock exam (formerly /full-sat). */
export const MOCK_EXAM_ROUTE = "/mbe-mock";
export const MOCK_EXAM_API_ROUTE = "/api/mbe-mock";

const MBE_SUBJECT_KEYS = new Set<string>(MBE_SUBJECTS.map((s) => s.key));

export function isMbeSubject(subject: string): subject is MbeSubject {
  return MBE_SUBJECT_KEYS.has(subject);
}

/** True for MBE law subjects and legacy reading-writing (SAT migration). */
export function isMcqSubject(subject: string): boolean {
  return isMbeSubject(subject) || subject === "reading-writing";
}

export function getSubjectLabel(subject: string): string {
  const found = MBE_SUBJECTS.find((s) => s.key === subject);
  if (found) return found.label;
  const legacy: Record<string, string> = {
    math: "Math",
    "reading-writing": "Reading & Writing",
    science: "Science",
    "social-studies": "Social Studies",
  };
  return legacy[subject] ?? subject;
}

export function getSubjectLabelsMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const s of MBE_SUBJECTS) map[s.key] = s.label;
  return map;
}

/** Problem sources used for MBE / bar exam content in the DB. */
export const EXAM_PROBLEM_SOURCES = ["practice", "sat"] as const;

/** Subjects supported in quiz / personalized practice flows. */
export type QuizSubject = MbeSubject | "math" | "reading-writing";
