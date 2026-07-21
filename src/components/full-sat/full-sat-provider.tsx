"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { FullSatContext, type FullSatPhase } from "./full-sat-context";
import { useAnswerFullSat, useSubmitFullSat } from "@/hooks/use-full-sat";
import { mockExamTimeLimitSeconds } from "@/lib/mbe-mock/constants";
import {
  questionToSectionModule,
  MODULE_TIME_LIMITS,
  type FullSatTestProblem,
  type FullSatAnswer,
  type FullSatAttempt,
  type FullSatTest,
  type FullSatSection,
} from "@/types/full-sat";

type Props = {
  attempt: FullSatAttempt;
  test: FullSatTest;
  problems: FullSatTestProblem[];
  initialAnswers: FullSatAnswer[];
  children: React.ReactNode;
};

function getModuleTimeLimit(section: FullSatSection, module: number): number {
  return MODULE_TIME_LIMITS[section][module as 1 | 2];
}

function getSectionLabel(section: FullSatSection): string {
  return section === "reading_writing" ? "Reading & Writing" : "Math";
}

export function FullSatProvider({
  attempt,
  test,
  problems,
  initialAnswers,
  children,
}: Props) {
  const router = useRouter();
  const answerMutation = useAnswerFullSat();
  const submitMutation = useSubmitFullSat();

  /** MBE mock: single continuous block (no Math section). */
  const isContinuousMock = useMemo(
    () => problems.length > 0 && !problems.some((p) => p.section === "math"),
    [problems]
  );

  // Build initial state from any existing answers
  const [answers, setAnswers] = useState<Map<string, number>>(() => {
    const map = new Map<string, number>();
    for (const a of initialAnswers) {
      if (a.selectedOption != null) {
        map.set(a.problemId, a.selectedOption);
      }
    }
    return map;
  });

  const [lockedIds, setLockedIds] = useState<Set<string>>(() => {
    const set = new Set<string>();
    for (const a of initialAnswers) {
      if (a.selectedOption != null) set.add(a.problemId);
    }
    return set;
  });

  // Determine starting position
  const resumeIndex = useMemo(() => {
    for (let i = 0; i < problems.length; i++) {
      if (!lockedIds.has(problems[i].problemId)) return i;
    }
    return 0;
  }, [problems, lockedIds]);

  const [currentIndex, setCurrentIndex] = useState(resumeIndex);
  const [direction, setDirection] = useState(1);

  const [phase, setPhase] = useState<FullSatPhase>(() => {
    if (attempt.status === "completed") return "completed";
    return "active";
  });

  const currentProblem = problems[currentIndex] ?? null;
  const currentPos = isContinuousMock
    ? {
        section: "reading_writing" as const,
        module: 1,
        orderIndex: currentIndex,
      }
    : questionToSectionModule(currentIndex + 1);

  const [rwTimeUsed, setRwTimeUsed] = useState(attempt.rwTimeSeconds ?? 0);
  const [mathTimeUsed, setMathTimeUsed] = useState(attempt.mathTimeSeconds ?? 0);

  const sectionStartRef = useRef(Date.now());
  const [timeLeft, setTimeLeft] = useState(() => {
    if (isContinuousMock) {
      const used = (attempt.rwTimeSeconds ?? 0) + (attempt.mathTimeSeconds ?? 0);
      return Math.max(0, mockExamTimeLimitSeconds(problems.length) - used);
    }
    const used =
      currentPos.section === "reading_writing"
        ? attempt.rwTimeSeconds ?? 0
        : attempt.mathTimeSeconds ?? 0;
    const sectionLimit =
      getModuleTimeLimit(currentPos.section, 1) +
      getModuleTimeLimit(currentPos.section, 2);
    return Math.max(0, sectionLimit - used);
  });

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const submitRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (phase !== "active") {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    sectionStartRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, currentPos.section, isContinuousMock]);

  const goNext = useCallback(() => {
    setDirection(1);
    setCurrentIndex((i) => Math.min(i + 1, problems.length - 1));
  }, [problems.length]);

  const goBack = useCallback(() => {
    setDirection(-1);
    setCurrentIndex((i) => Math.max(i - 1, 0));
  }, []);

  const goTo = useCallback(
    (index: number) => {
      setDirection(index > currentIndex ? 1 : -1);
      setCurrentIndex(Math.max(0, Math.min(index, problems.length - 1)));
    },
    [currentIndex, problems.length]
  );

  const handleSelectAnswer = useCallback(
    (problemId: string, optionIndex: number) => {
      if (phase !== "active") return;

      const problem = problems.find((p) => p.problemId === problemId);
      if (!problem) return;

      setAnswers((prev) => new Map(prev).set(problemId, optionIndex));
      setLockedIds((prev) => new Set(prev).add(problemId));

      answerMutation.mutate({
        attemptId: attempt.id,
        problemId,
        section: problem.section,
        module: problem.module,
        orderIndex: problem.orderIndex,
        selectedOption: optionIndex,
        isCorrect:
          optionIndex ===
          (problem as { correctOption?: number }).correctOption,
        responseTimeMs: undefined,
      });
    },
    [phase, problems, attempt.id, answerMutation]
  );

  const submitTest = useCallback(() => {
    let finalRw = rwTimeUsed;
    let finalMath = mathTimeUsed;

    if (isContinuousMock) {
      finalRw = Math.max(
        0,
        mockExamTimeLimitSeconds(problems.length) - timeLeft
      );
      finalMath = 0;
    } else {
      const elapsed = Math.round((Date.now() - sectionStartRef.current) / 1000);
      finalMath = mathTimeUsed + elapsed;
    }

    setPhase("completed");

    submitMutation.mutate(
      {
        attemptId: attempt.id,
        rwTimeSeconds: finalRw,
        mathTimeSeconds: finalMath,
      },
      {
        onSuccess: () => {
          router.push(`/mbe-mock/${attempt.id}/results`);
        },
      }
    );
  }, [
    attempt.id,
    rwTimeUsed,
    mathTimeUsed,
    submitMutation,
    router,
    isContinuousMock,
    problems.length,
    timeLeft,
  ]);

  submitRef.current = submitTest;

  const finishSection = useCallback(() => {
    if (isContinuousMock) {
      submitRef.current();
      return;
    }

    const elapsed = Math.round((Date.now() - sectionStartRef.current) / 1000);
    setRwTimeUsed((prev) => prev + elapsed);

    setPhase("break");
    router.push(`/mbe-mock/${attempt.id}/break`);
  }, [attempt.id, router, isContinuousMock]);

  useEffect(() => {
    if (timeLeft === 0 && phase === "active") {
      if (isContinuousMock || currentPos.section === "math") {
        submitRef.current();
      } else {
        finishSection();
      }
    }
  }, [timeLeft, phase, currentPos.section, isContinuousMock, finishSection]);

  const displayTime = useMemo(() => {
    const m = Math.floor(timeLeft / 60);
    const s = timeLeft % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }, [timeLeft]);

  const getQuestionStatus = useCallback(
    (index: number): "unanswered" | "answered" => {
      const problem = problems[index];
      if (!problem) return "unanswered";
      return lockedIds.has(problem.problemId) ? "answered" : "unanswered";
    },
    [problems, lockedIds]
  );

  const answeredCount = lockedIds.size;
  const sectionLabel = isContinuousMock
    ? "Mock Exam"
    : getSectionLabel(currentPos.section);
  const moduleLabel = isContinuousMock
    ? "All Subjects"
    : `Module ${currentPos.module}`;

  return (
    <FullSatContext.Provider
      value={{
        attempt,
        test,
        problems,
        currentIndex,
        currentSection: currentPos.section,
        currentModule: currentPos.module,
        currentProblem,
        answers,
        lockedIds,
        phase,
        timeLeft,
        displayTime,
        goNext,
        goBack,
        goTo,
        direction,
        handleSelectAnswer,
        finishSection,
        submitTest,
        getQuestionStatus,
        totalQuestions: problems.length,
        answeredCount,
        sectionLabel,
        moduleLabel,
        rwTimeUsed,
        mathTimeUsed,
      }}
    >
      {children}
    </FullSatContext.Provider>
  );
}
