import { supabase } from "@/lib/supabase/client";

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
  orderIndex: number;
  category: string;
  difficulty: string;
  questionText: string;
  options: string[];
};

export async function getOnboardingDiagnosticProblems(): Promise<
  DiagnosticProblem[]
> {
  const { data, error } = await supabase
    .from("problems")
    .select("id, order_index, category, difficulty, question_text, options")
    .eq("source", "onboarding")
    .order("order_index");

  if (error) throw error;

  return (data ?? []).map((p) => ({
    id: p.id,
    orderIndex: p.order_index,
    category: p.category ?? "",
    difficulty: p.difficulty,
    questionText: p.question_text,
    options: (p.options as string[]) ?? [],
  }));
}

export async function getOnboardingProblemsWithAnswers() {
  const { data, error } = await supabase
    .from("problems")
    .select("id, category, correct_option")
    .eq("source", "onboarding")
    .order("order_index");

  if (error) throw error;
  return data ?? [];
}
