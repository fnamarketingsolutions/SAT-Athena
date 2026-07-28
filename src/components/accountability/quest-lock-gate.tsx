"use client";

/**
 * Previously redirected learners to /quest until today's practice was done.
 * Daily practice is optional for navigation — this gate is a no-op.
 */
export function QuestLockGate({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
