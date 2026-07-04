import type { QuizSubject } from "@/lib/exam-config";

/** Default subject when practice generation requests omit one. */
export const DEFAULT_PRACTICE_SUBJECT: QuizSubject = "civil-procedure";

export function resolvePracticeSubject(subject?: string | null): QuizSubject {
  return (subject as QuizSubject | undefined) ?? DEFAULT_PRACTICE_SUBJECT;
}

export function getAgentServiceUrl(
  fallback = "http://localhost:8080"
): string {
  return process.env.AGENT_SERVICE_URL || fallback;
}
