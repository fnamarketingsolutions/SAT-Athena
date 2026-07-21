import { getAuthIdentity, getAppUser } from "@/lib/auth/current-user";
import {
  getAttemptAnswers,
  getAttemptById,
  getTestProblems,
} from "@/lib/db/queries/full-sat";
import { MBE_PASS_PERCENT, getSubjectLabel, MBE_SUBJECTS } from "@/lib/exam-config";
import {
  averageSecondsPerQuestion,
  getPaceStatus,
} from "@/lib/pacing";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ attemptId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { attemptId } = await params;
  const { userId: clerkId } = await getAuthIdentity();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getAppUser(clerkId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const attempt = await getAttemptById(attemptId);
  if (!attempt || attempt.userId !== user.id) {
    return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
  }

  if (attempt.status !== "completed") {
    return NextResponse.json(
      { error: "Attempt is not completed yet" },
      { status: 409 }
    );
  }

  const [problems, answers] = await Promise.all([
    getTestProblems(attempt.testId),
    getAttemptAnswers(attemptId),
  ]);

  const answerByProblem = new Map(
    answers.map((a) => [a.problemId, a] as const)
  );

  const correctCount = answers.filter((a) => a.isCorrect).length;
  const answeredCount = answers.filter((a) => a.selectedOption != null).length;
  const total = problems.length || answers.length;
  const percent =
    total > 0 ? Math.round((correctCount / total) * 100) : 0;
  const avgSeconds = averageSecondsPerQuestion(
    attempt.totalTimeSeconds,
    answeredCount > 0 ? answeredCount : total
  );

  const subjectStats = new Map<
    string,
    { key: string; label: string; correct: number; total: number }
  >();

  for (const subject of MBE_SUBJECTS) {
    subjectStats.set(subject.key, {
      key: subject.key,
      label: subject.label,
      correct: 0,
      total: 0,
    });
  }

  const questions = problems.map((p, index) => {
    const answer = answerByProblem.get(p.problemId);
    const subjectKey = p.topicSlug?.trim() || "torts";
    const bucket = subjectStats.get(subjectKey) ?? {
      key: subjectKey,
      label: getSubjectLabel(subjectKey),
      correct: 0,
      total: 0,
    };
    bucket.total += 1;
    if (answer?.isCorrect) bucket.correct += 1;
    subjectStats.set(subjectKey, bucket);

    return {
      index,
      problemId: p.problemId,
      subject: subjectKey,
      subjectLabel: getSubjectLabel(subjectKey),
      difficulty: p.difficulty,
      questionText: p.questionText,
      options: p.options,
      correctOption: p.correctOption,
      explanation: p.explanation,
      solutionSteps: p.solutionSteps ?? [],
      selectedOption: answer?.selectedOption ?? null,
      isCorrect: answer?.isCorrect ?? null,
    };
  });

  const subjects = [...subjectStats.values()]
    .filter((s) => s.total > 0)
    .map((s) => ({
      ...s,
      accuracy: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return NextResponse.json({
    attemptId: attempt.id,
    completedAt: attempt.completedAt,
    totalTimeSeconds: attempt.totalTimeSeconds,
    summary: {
      correct: correctCount,
      total,
      answeredCount,
      percent,
      passed: percent >= MBE_PASS_PERCENT,
      passTarget: MBE_PASS_PERCENT,
      avgSecondsPerQuestion: avgSeconds,
      paceStatus: avgSeconds != null ? getPaceStatus(avgSeconds) : null,
    },
    subjects,
    questions,
  });
}
