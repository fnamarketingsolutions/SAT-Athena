import { MBE_SUBJECTS } from "@/lib/exam-config";
import { PACE_SECONDS_PER_QUESTION } from "@/lib/pacing";

/** Base questions per MBE subject in a standard mock (~14 each). */
export const MOCK_EXAM_QUESTIONS_PER_SUBJECT = 14;

/** Extra questions randomly assigned across subjects to reach 100. */
export const MOCK_EXAM_EXTRA_QUESTIONS = 2;

export const MOCK_EXAM_QUESTION_COUNT =
  MBE_SUBJECTS.length * MOCK_EXAM_QUESTIONS_PER_SUBJECT +
  MOCK_EXAM_EXTRA_QUESTIONS;

/** Official MBE-style block length: 1:48 per question × total questions. */
export function mockExamTimeLimitSeconds(
  questionCount = MOCK_EXAM_QUESTION_COUNT
): number {
  return questionCount * PACE_SECONDS_PER_QUESTION;
}

/**
 * Allocate question counts: 14 per subject, then +1 to two random subjects
 * so the set totals exactly 100.
 */
export function allocateMockExamSubjectCounts(
  rng: () => number = Math.random
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const subject of MBE_SUBJECTS) {
    counts[subject.key] = MOCK_EXAM_QUESTIONS_PER_SUBJECT;
  }

  const keys = MBE_SUBJECTS.map((s) => s.key);
  for (let i = 0; i < MOCK_EXAM_EXTRA_QUESTIONS; i++) {
    const pick = keys[Math.floor(rng() * keys.length)]!;
    counts[pick] += 1;
  }

  return counts;
}
