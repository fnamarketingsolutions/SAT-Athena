/**
 * Question selection and scoring for the onboarding diagnostic.
 *
 * The diagnostic used to read a dedicated set of problems stored under
 * `source = 'onboarding'`, seeded by a migration from a legacy `questions`
 * table. That table is long gone, so the set was empty and the diagnostic
 * could not start at all. It now samples the live MBE library instead, which
 * means there is nothing extra to seed and the questions stay in step with the
 * rest of the content.
 */

export const DIAGNOSTIC_QUESTION_COUNT = 12;

/**
 * Take `count` items spread across `bySubject`, which is expected to hold one
 * queue per subject ordered from easiest to hardest.
 *
 * Two things are being balanced. Rotating subjects each round keeps a lopsided
 * library from skewing the sample — Civil Procedure has nearly twice the
 * problems of Contracts, and taking them in bulk would grade a student mostly
 * on one subject. Striding through each queue rather than taking its first few
 * entries keeps the sample from being all easy questions, which would read as
 * competence the student may not have.
 */
export function selectDiagnosticSpread<T>(bySubject: T[][], count: number): T[] {
  const queues = bySubject.filter((queue) => queue.length > 0);
  if (queues.length === 0 || count <= 0) return [];

  const rounds = Math.max(1, Math.ceil(count / queues.length));
  const taken = queues.map(() => new Set<number>());
  const picked: T[] = [];

  const take = (queue: number, index: number) => {
    if (index < 0 || index >= queues[queue].length) return;
    if (taken[queue].has(index)) return;
    taken[queue].add(index);
    picked.push(queues[queue][index]);
  };

  for (let round = 0; round < rounds && picked.length < count; round += 1) {
    for (let q = 0; q < queues.length && picked.length < count; q += 1) {
      const stride = Math.max(1, Math.floor(queues[q].length / rounds));
      take(q, round * stride);
    }
  }

  // A subject with fewer problems than there are rounds runs out mid-rotation.
  // Top up from whatever is left so the student always gets a full diagnostic
  // rather than a silently shorter one.
  for (let q = 0; q < queues.length && picked.length < count; q += 1) {
    for (let i = 0; i < queues[q].length && picked.length < count; i += 1) {
      take(q, i);
    }
  }

  return picked;
}

/**
 * Convert diagnostic accuracy into the app's stored composite score.
 *
 * `current_composite` is inherited from this codebase's SAT origins and is
 * still what the adaptive engine and analytics read: `computeGlobalFloor`
 * picks a daily-quest difficulty floor from it, and the analytics dashboard
 * turns it back into a percentage by dividing by 16. Scaling accuracy by that
 * same factor keeps both consumers correct without a schema migration —
 * analytics recovers exactly the accuracy measured here.
 */
export function accuracyToComposite(accuracyPercent: number): number {
  const pct = Math.min(100, Math.max(0, accuracyPercent));
  return Math.round(pct * 16);
}
