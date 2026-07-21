"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { MOCK_EXAM_LABEL } from "@/lib/exam-config";
import { useFullSatContext } from "@/components/full-sat/full-sat-context";
import { Toolbar } from "@/components/quiz/toolbar";
import { SegmentProgressBar } from "@/components/quiz/segment-progress-bar";
import { QuestionPanel } from "@/components/quiz/question-panel";
import { AnswerPanel } from "@/components/quiz/answer-panel";
import { BottomBar } from "@/components/quiz/bottom-bar";
import { Calculator } from "@/components/quiz/calculator";
import { PaceTimer } from "@/components/quiz/pace-timer";
import { usePaceTimer } from "@/hooks/use-pace-timer";

export default function FullSatQuestionPage() {
  const router = useRouter();
  const params = useParams<{ attemptId: string; questionNumber: string }>();
  const questionNum = Math.max(1, parseInt(params.questionNumber, 10) || 1);
  const ctx = useFullSatContext();

  const [calcOpen, setCalcOpen] = useState(false);
  const [timerHidden, setTimerHidden] = useState(false);

  const currentProblem = ctx.currentProblem;
  // Mock Exam: Time Pace is permanently ON (real exam pressure).
  const pace = usePaceTimer(true, currentProblem?.problemId ?? questionNum);

  const isContinuousMock =
    ctx.problems.length > 0 &&
    !ctx.problems.some((p) => p.section === "math");

  // Sync URL <-> currentIndex
  const syncedRef = useRef(false);
  useEffect(() => {
    if (!syncedRef.current) {
      syncedRef.current = true;
      const targetIndex = questionNum - 1;
      if (
        targetIndex !== ctx.currentIndex &&
        targetIndex >= 0 &&
        targetIndex < ctx.totalQuestions
      ) {
        ctx.goTo(targetIndex);
      }
      return;
    }
    router.push(`/mbe-mock/${params.attemptId}/${ctx.currentIndex + 1}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.currentIndex]);

  if (!currentProblem) return null;

  // Convert to quiz Problem shape for reused components
  // Hide correct answers + explanations until the post-submit summary.
  const asProblem = {
    id: currentProblem.problemId,
    orderIndex: currentProblem.orderIndex,
    difficulty: currentProblem.difficulty,
    questionText: currentProblem.questionText,
    options: currentProblem.options,
    correctOption: -1,
    explanation: "",
    solutionSteps: [],
    hint: "",
    detailedHint: undefined,
    timeRecommendationSeconds: 90,
  };

  const isLow = ctx.timeLeft < 300; // 5 minutes warning
  const isMathSection = !isContinuousMock && ctx.currentSection === "math";

  const sectionStart = isContinuousMock ? 0 : isMathSection ? 54 : 0;
  const sectionEnd = isContinuousMock
    ? ctx.totalQuestions
    : isMathSection
      ? 98
      : 54;
  const sectionTotal = sectionEnd - sectionStart;
  const sectionIndex = ctx.currentIndex - sectionStart;

  const handleSubmitOrFinishSection = () => {
    if (isContinuousMock || isMathSection) {
      ctx.submitTest();
    } else {
      ctx.finishSection();
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-0 top-14 z-40 flex flex-col bg-background md:left-[15rem] md:top-0">
      <Toolbar
        displayTime={ctx.displayTime}
        isLow={isLow}
        timerHidden={timerHidden}
        onToggleTimer={() => setTimerHidden((h) => !h)}
        calcOpen={calcOpen}
        onToggleCalc={() => setCalcOpen((o) => !o)}
        onClose={() => router.push("/mbe-mock")}
        hasAnswers={ctx.answeredCount > 0}
        subtopicName={`${ctx.sectionLabel} - ${ctx.moduleLabel}`}
        showCalc={isMathSection}
        title={MOCK_EXAM_LABEL}
      />

      <SegmentProgressBar
        total={sectionTotal}
        currentIndex={sectionIndex}
        getStatus={(i) => ctx.getQuestionStatus(i + sectionStart)}
        onNavigate={() => {}}
      />

      {/* Section + module label */}
      <div className="flex min-w-0 items-center gap-2 border-b border-border/50 px-4 py-1.5">
        <span className="truncate text-xs font-semibold text-muted-foreground">
          {ctx.sectionLabel}
        </span>
        <span className="shrink-0 text-xs text-muted-foreground/50">|</span>
        <span className="truncate text-xs font-medium text-primary">
          {ctx.moduleLabel}
        </span>
        <span className="ml-auto shrink-0 text-xs text-muted-foreground">
          Q{ctx.currentIndex + 1}/{ctx.totalQuestions}
        </span>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="flex min-h-0 w-full flex-col overflow-y-auto md:flex-row md:overflow-hidden md:divide-x">
          <QuestionPanel
            problem={asProblem}
            questionNumber={sectionIndex + 1}
            emphasize={ctx.answers.has(currentProblem.problemId)}
            aboveCard={
              <PaceTimer
                display={pace.display}
                zone={pace.zone}
                isOvertime={pace.isOvertime}
              />
            }
          />
          <AnswerPanel
            problem={asProblem}
            questionNumber={sectionIndex + 1}
            selectedOption={ctx.answers.get(currentProblem.problemId)}
            isMarked={false}
            onSelect={(i) => ctx.handleSelectAnswer(currentProblem.problemId, i)}
            onToggleMark={() => {}}
            direction={ctx.direction}
            disabled={false}
            showMark={false}
          />
        </div>
      </div>

      <BottomBar
        currentIndex={sectionIndex}
        total={sectionTotal}
        unansweredCount={
          Array.from({ length: sectionTotal }, (_, i) =>
            ctx.getQuestionStatus(i + sectionStart)
          ).filter((s) => s === "unanswered").length
        }
        onBack={() => {
          if (sectionIndex > 0) ctx.goBack();
        }}
        onNext={() => {
          if (sectionIndex < sectionTotal - 1) ctx.goNext();
        }}
        onGoTo={(i) => ctx.goTo(i + sectionStart)}
        onSubmit={handleSubmitOrFinishSection}
        getStatus={(i) => ctx.getQuestionStatus(i + sectionStart)}
        sequential={false}
        nextDisabled={false}
      />

      <AnimatePresence>
        {calcOpen && isMathSection && <Calculator />}
      </AnimatePresence>
    </div>
  );
}
