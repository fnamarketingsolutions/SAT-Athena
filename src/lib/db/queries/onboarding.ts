import { supabase } from "@/lib/supabase/client";
import { getSubjectLabel, MBE_SUBJECTS } from "@/lib/exam-config";
import {
  DIAGNOSTIC_QUESTION_COUNT,
  selectDiagnosticSpread,
} from "@/lib/onboarding-diagnostic";

export type OnboardingStep =
  | "welcome"
  | "baseline"
  | "diagnostic"
  | "self_report"
  | "goals"
  | "schedule"
  | "done";

export type OnboardingProgress = {
  id: string;
  userId: string;
  currentStep: OnboardingStep;
  quizQuestionIndex: number;
  lessonPreference: string | null;
};

function mapProgress(row: {
  id: string;
  user_id: string;
  current_step: string;
  quiz_question_index: number;
  lesson_preference: string | null;
}): OnboardingProgress {
  return {
    id: row.id,
    userId: row.user_id,
    currentStep: row.current_step as OnboardingStep,
    quizQuestionIndex: row.quiz_question_index,
    lessonPreference: row.lesson_preference,
  };
}

export async function getOnboardingProgress(
  userId: string
): Promise<OnboardingProgress | null> {
  const { data } = await supabase
    .from("onboarding_progress")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  return data ? mapProgress(data) : null;
}

export async function ensureOnboardingProgress(
  userId: string
): Promise<OnboardingProgress> {
  const existing = await getOnboardingProgress(userId);
  if (existing) return existing;

  const { data, error } = await supabase
    .from("onboarding_progress")
    .insert({ user_id: userId, current_step: "welcome" })
    .select()
    .single();

  if (error) throw error;
  return mapProgress(data);
}

export async function updateOnboardingProgress(
  userId: string,
  data: Partial<{
    currentStep: OnboardingStep;
    quizQuestionIndex: number;
    lessonPreference: string | null;
  }>
) {
  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (data.currentStep !== undefined) update.current_step = data.currentStep;
  if (data.quizQuestionIndex !== undefined) {
    update.quiz_question_index = data.quizQuestionIndex;
  }
  if (data.lessonPreference !== undefined) {
    update.lesson_preference = data.lessonPreference;
  }

  const { data: row, error } = await supabase
    .from("onboarding_progress")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update(update as any)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw error;
  return mapProgress(row);
}

export type DiagnosticProblem = {
  id: string;
  subject: string;
  subjectLabel: string;
  questionText: string;
  options: string[];
};

type CandidateRow = {
  id: string;
  question_text: string;
  options: unknown;
  subtopics: { topics: { subject: string } | null } | null;
};

/**
 * A 12-question sample of the MBE library, rotated across the seven bar
 * subjects.
 *
 * The subject filter runs on the joined `topics` row rather than on
 * `problems.source`, because the library still holds legacy SAT problems
 * alongside the bar ones and the two are not distinguished by source.
 */
export async function getOnboardingDiagnosticProblems(): Promise<
  DiagnosticProblem[]
> {
  const { data, error } = await supabase
    .from("problems")
    .select(
      "id, question_text, options, subtopics!inner(topics!inner(subject))"
    )
    .in(
      "subtopics.topics.subject",
      MBE_SUBJECTS.map((s) => s.key)
    )
    // Ascending difficulty, so `selectDiagnosticSpread` can stride through each
    // subject's range instead of collecting only its easiest problems.
    .order("difficulty_level", { ascending: true })
    .order("id", { ascending: true });

  if (error) throw error;

  const rows = (data ?? []) as unknown as CandidateRow[];
  const bySubject = MBE_SUBJECTS.map((subject) =>
    rows.filter((row) => row.subtopics?.topics?.subject === subject.key)
  );

  return selectDiagnosticSpread(bySubject, DIAGNOSTIC_QUESTION_COUNT).map(
    (row) => {
      const subject = row.subtopics?.topics?.subject ?? "";
      return {
        id: row.id,
        subject,
        subjectLabel: getSubjectLabel(subject),
        questionText: row.question_text,
        options: (row.options as string[]) ?? [],
      };
    }
  );
}

/**
 * Correct answers for the problems a student actually submitted. The
 * diagnostic set is sampled per request rather than stored, so scoring has to
 * look up the served problems by id instead of re-reading a fixed set.
 */
export async function getProblemAnswers(problemIds: string[]) {
  if (problemIds.length === 0) return [];

  const { data, error } = await supabase
    .from("problems")
    .select("id, correct_option")
    .in("id", problemIds);

  if (error) throw error;
  return data ?? [];
}
