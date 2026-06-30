"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  ChevronRight,
  MessageCircle,
  Send,
  X,
  Check,
  HelpCircle,
  Loader2,
  Trophy,
} from "lucide-react";
import { useStudioLesson } from "@/hooks/use-studio-lesson";
import { useStudioQuiz } from "@/hooks/use-studio-quiz";
import { WhiteboardCanvas } from "@/components/whiteboard/whiteboard-canvas";
import { useStepPlayer } from "@/hooks/use-step-player";
import { QuizPlayer } from "@/components/studio/QuizPlayer";
import { MessageBubble } from "@/components/lessons/message-bubble";
import { ThinkingIndicator } from "@/components/lessons/thinking-indicator";
import { GenerationProgress } from "@/components/lessons/generation-progress";
import { MathContent } from "@/components/quiz/math-content";
import { cn } from "@/lib/utils";
import type { WhiteboardStep } from "@/types/whiteboard";

type SessionReport = {
  score?: number;
  phases_completed?: string[];
  areas_of_struggle?: string[];
  recommendation?: string;
  summary?: string;
};

interface StudioLessonPlayerProps {
  agentId: string;
  agentName: string;
  agentColor: string;
  skillName: string;
  skillDescription?: string;
  studentContext?: Record<string, unknown>;
  existingSession?: {
    sessionId: string;
    steps: WhiteboardStep[];
    lessonContent?: string;
  };
  onSessionCreated?: (sessionId: string) => void;
  onComplete: (report: SessionReport, sessionId?: string | null) => void;
}

export function StudioLessonPlayer({
  agentId,
  agentName,
  agentColor,
  skillName,
  skillDescription,
  studentContext,
  existingSession,
  onSessionCreated,
  onComplete,
}: StudioLessonPlayerProps) {
  const {
    phase,
    lessonContent,
    messages,
    isProcessing,
    whiteboardSteps,
    isWhiteboardStreaming,
    sessionId,
    generateLesson,
    sendMessage,
    recordSessionEvent,
  } = useStudioLesson({
    agentId,
    skillName,
    skillDescription,
    studentContext,
    existingSession,
  });

  const {
    state: playerState,
    userStepIndex,
    currentStepIndex,
    stepProgress,
    visibleStepIds,
    canAdvance,
    isLastStep,
    isCheckIn,
    currentCheckIn,
    isInteraction,
    currentPrediction,
    currentFillBlank,
    advance,
  } = useStepPlayer(whiteboardSteps, isWhiteboardStreaming);

  // Quiz skill
  const quiz = useStudioQuiz();
  const [lessonPhase, setLessonPhase] = useState<"teaching" | "quiz" | "quiz_results">("teaching");
  const [quizScore, setQuizScore] = useState<{ correct: number; total: number } | null>(null);

  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [checkInAnswer, setCheckInAnswer] = useState<number | null>(null);
  const [checkInSubmitted, setCheckInSubmitted] = useState(false);
  const [fillBlankAnswer, setFillBlankAnswer] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-start generation on mount (skip if hydrated from existing session)
  useEffect(() => {
    if (!existingSession) {
      generateLesson();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Notify parent when a session is created
  useEffect(() => {
    if (sessionId && onSessionCreated) {
      onSessionCreated(sessionId);
    }
  }, [sessionId, onSessionCreated]);

  // Record step_viewed events
  const prevStepRef = useRef(-1);
  useEffect(() => {
    if (currentStepIndex > prevStepRef.current && whiteboardSteps[currentStepIndex]) {
      prevStepRef.current = currentStepIndex;
      const step = whiteboardSteps[currentStepIndex];
      recordSessionEvent("step_viewed", {
        step_index: currentStepIndex,
        narration: step.narration || "",
        display_text: step.displayText || "",
      });
    }
  }, [currentStepIndex, whiteboardSteps, recordSessionEvent]);

  // Scroll chat to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleChatSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!chatInput.trim()) return;
      sendMessage(chatInput.trim());
      setChatInput("");
    },
    [chatInput, sendMessage]
  );

  const handleCheckInAnswer = useCallback(
    (optionIndex: number) => {
      if (checkInSubmitted) return;
      setCheckInAnswer(optionIndex);
    },
    [checkInSubmitted]
  );

  const handleCheckInSubmit = useCallback(() => {
    setCheckInSubmitted(true);
    // Record check-in event
    if (currentCheckIn && checkInAnswer !== null) {
      recordSessionEvent("check_in_answered", {
        question: currentCheckIn.question,
        answer: currentCheckIn.options?.[checkInAnswer] || String(checkInAnswer),
        correct: checkInAnswer === currentCheckIn.correctOption,
        step_index: currentStepIndex,
      });
    }
    // Auto-advance after brief delay
    setTimeout(() => {
      setCheckInAnswer(null);
      setCheckInSubmitted(false);
      advance();
    }, 1500);
  }, [advance, currentCheckIn, checkInAnswer, currentStepIndex, recordSessionEvent]);

  const handleFillBlankSubmit = useCallback(() => {
    if (currentFillBlank) {
      recordSessionEvent("fill_blank_answered", {
        prompt: currentFillBlank.prompt,
        answer: fillBlankAnswer,
        step_index: currentStepIndex,
      });
    }
    setFillBlankAnswer("");
    advance();
  }, [advance, currentFillBlank, fillBlankAnswer, currentStepIndex, recordSessionEvent]);

  const handlePredictionSubmit = useCallback(() => {
    if (currentPrediction) {
      recordSessionEvent("prediction_answered", {
        question: currentPrediction.question,
        step_index: currentStepIndex,
      });
    }
    advance();
  }, [advance, currentPrediction, currentStepIndex, recordSessionEvent]);

  const handleStartQuiz = useCallback(async () => {
    setLessonPhase("quiz");
    recordSessionEvent("quiz_started", { skill_name: skillName });
    await quiz.generateQuestions(
      skillName,
      "medium",
      3,
      sessionId,
      agentId
    );
  }, [skillName, sessionId, agentId, quiz, recordSessionEvent]);

  const handleQuizComplete = useCallback(
    (score: { correct: number; total: number }) => {
      setQuizScore(score);
      setLessonPhase("quiz_results");
      recordSessionEvent("quiz_completed", {
        correct: score.correct,
        total: score.total,
      });
    },
    [recordSessionEvent]
  );

  const handleQuizRequestMore = useCallback(
    async (difficulty: string) => {
      setLessonPhase("quiz");
      await quiz.generateQuestions(skillName, difficulty, 3, sessionId, agentId);
    },
    [skillName, sessionId, agentId, quiz]
  );

  const handleBackToLesson = useCallback(() => {
    setLessonPhase("teaching");
    quiz.reset();
    setQuizScore(null);
  }, [quiz]);

  const handleEndSession = useCallback(() => {
    // Record session ended event
    recordSessionEvent("session_ended", {
      completed: isLastStep,
      steps_viewed: currentStepIndex + 1,
      total_steps: whiteboardSteps.length,
    });

    const phasesCompleted = isLastStep ? ["teaching"] : [];
    if (quizScore) phasesCompleted.push("quiz");
    phasesCompleted.push("complete");

    const report: SessionReport = {
      score: quizScore
        ? Math.round((quizScore.correct / Math.max(quizScore.total, 1)) * 100)
        : undefined,
      summary: quizScore
        ? `Completed a lesson on "${skillName}" with ${agentName}. Quiz score: ${quizScore.correct}/${quizScore.total}.`
        : `Completed a lesson on "${skillName}" with ${agentName}.`,
      phases_completed: phasesCompleted,
      recommendation: quizScore
        ? quizScore.correct === quizScore.total
          ? "Excellent mastery! Ready for the next topic."
          : "Consider reviewing the areas you found challenging."
        : isLastStep
          ? "Great job! Try testing yourself with a quiz."
          : "Consider revisiting to finish the lesson.",
    };

    // Report to backend (fire-and-forget)
    if (sessionId) {
      fetch(`/api/studio/agents/sessions/${sessionId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(report),
      }).catch(() => {});
    }

    onComplete(report, sessionId);
  }, [skillName, agentName, isLastStep, sessionId, onComplete, recordSessionEvent, currentStepIndex, whiteboardSteps.length]);

  // ─── Generating State ────────────────────────────────────────────────────────
  if (phase === "generating" && whiteboardSteps.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-6"
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-2xl"
            style={{ backgroundColor: agentColor }}
          >
            {agentName.charAt(0).toUpperCase()}
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              {agentName} is preparing your lesson
            </h2>
            <p className="text-sm text-muted-foreground">{skillName}</p>
          </div>
          <GenerationProgress />
        </motion.div>
      </div>
    );
  }

  // ─── Error State ─────────────────────────────────────────────────────────────
  if (phase === "error") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full p-8 rounded-2xl border border-red-500/30 bg-card text-center space-y-4"
        >
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
            <X className="w-6 h-6 text-red-400" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            Something went wrong
          </h2>
          <p className="text-sm text-muted-foreground">
            We couldn't generate the lesson. This could be a temporary issue.
          </p>
          <Button
            onClick={() => window.location.reload()}
            className="bg-secondary text-foreground border border-border hover:bg-muted"
          >
            Try Again
          </Button>
        </motion.div>
      </div>
    );
  }

  // ─── Main Lesson Player ──────────────────────────────────────────────────────
  return (
    <div className="h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Top Bar */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
            style={{ backgroundColor: agentColor }}
          >
            {agentName.charAt(0).toUpperCase()}
          </div>
          <div>
            <span className="text-sm font-medium text-foreground">
              {agentName}
            </span>
            <span className="text-xs text-muted-foreground ml-2">{skillName}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lessonPhase === "teaching" && whiteboardSteps.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleStartQuiz}
              disabled={quiz.isGenerating}
              className="text-muted-foreground hover:text-foreground text-xs"
            >
              {quiz.isGenerating ? (
                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
              ) : (
                <HelpCircle className="w-3.5 h-3.5 mr-1" />
              )}
              Quiz
            </Button>
          )}
          {lessonPhase !== "teaching" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToLesson}
              className="text-muted-foreground hover:text-foreground text-xs"
            >
              Back to Lesson
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setChatOpen(!chatOpen)}
            className="text-muted-foreground hover:text-foreground relative"
          >
            <MessageCircle className="w-4 h-4" />
            {messages.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleEndSession}
            className="text-muted-foreground hover:text-foreground text-xs"
          >
            End Session
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex relative overflow-hidden min-h-0">
        {/* Quiz Phase */}
        {lessonPhase === "quiz" && (
          <div
            className={cn(
              "flex-1 min-h-0 transition-all duration-300",
              chatOpen && "mr-[360px]"
            )}
          >
            {quiz.isGenerating && quiz.questions.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <div className="text-center space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    Generating quiz questions...
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Each question is independently verified for accuracy
                  </p>
                </div>
              </div>
            ) : quiz.questions.length > 0 ? (
              <QuizPlayer
                questions={quiz.questions}
                sessionId={sessionId}
                onComplete={handleQuizComplete}
                onRequestMore={handleQuizRequestMore}
                recordEvent={recordSessionEvent}
                checkAnswer={quiz.checkAnswer}
                requestWhiteboardExplanation={quiz.requestWhiteboardExplanation}
                explainSteps={quiz.explainSteps}
                isExplaining={quiz.isExplaining}
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-4">
                <p className="text-sm text-muted-foreground">
                  {quiz.error || "No questions could be generated."}
                </p>
                <Button
                  onClick={() => handleQuizRequestMore("medium")}
                  size="sm"
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Try Again
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Quiz Results Phase */}
        {lessonPhase === "quiz_results" && quizScore && (
          <div
            className={cn(
              "flex-1 min-h-0 flex items-center justify-center transition-all duration-300",
              chatOpen && "mr-[360px]"
            )}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-md w-full p-8 rounded-2xl border border-border bg-card text-center space-y-6"
            >
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Trophy className="w-8 h-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-foreground">
                  Quiz Complete!
                </h2>
                <p className="text-3xl font-bold text-primary">
                  {quizScore.correct}/{quizScore.total}
                </p>
                <p className="text-sm text-muted-foreground">
                  {quizScore.correct === quizScore.total
                    ? "Perfect score! You have strong understanding of this topic."
                    : quizScore.correct >= quizScore.total * 0.7
                      ? "Good work! You understand most of the material."
                      : "Keep practicing. Review the lesson and try again."}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  onClick={handleBackToLesson}
                  className="w-full bg-secondary text-foreground border border-border hover:bg-muted"
                >
                  Back to Lesson
                </Button>
                <Button
                  onClick={() => handleQuizRequestMore("medium")}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  More Questions
                </Button>
                <Button
                  onClick={handleEndSession}
                  variant="ghost"
                  className="w-full text-muted-foreground hover:text-foreground"
                >
                  End Session
                </Button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Whiteboard (teaching phase) */}
        {lessonPhase === "teaching" && <div
          className={cn(
            "flex-1 flex flex-col min-h-0 transition-all duration-300",
            chatOpen && "mr-[360px]"
          )}
        >
          {/* Whiteboard Canvas */}
          <div className="flex-1 relative min-h-0 overflow-hidden">
            <WhiteboardCanvas
              steps={whiteboardSteps}
              currentStepIndex={currentStepIndex}
              stepProgress={stepProgress}
              visibleStepIds={visibleStepIds}
            />
          </div>

          {/* Check-in / Interaction Overlay */}
          <AnimatePresence>
            {isCheckIn && currentCheckIn && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute inset-x-0 bottom-20 flex justify-center px-4 z-10"
              >
                <div className="max-w-md w-full p-5 rounded-xl bg-card border border-border shadow-xl">
                  <p className="text-sm font-medium text-foreground mb-3">
                    {currentCheckIn.question}
                  </p>
                  <div className="space-y-2">
                    {currentCheckIn.options?.map((option, idx) => {
                      const isSelected = checkInAnswer === idx;
                      const isCorrect = checkInSubmitted && idx === currentCheckIn.correctOption;
                      const isWrong = checkInSubmitted && isSelected && idx !== currentCheckIn.correctOption;
                      return (
                        <button
                          key={idx}
                          onClick={() => handleCheckInAnswer(idx)}
                          disabled={checkInSubmitted}
                          className={cn(
                            "w-full text-left px-4 py-2.5 rounded-lg text-sm transition-all border",
                            isCorrect
                              ? "border-green-500/50 bg-green-500/10 text-green-300"
                              : isWrong
                                ? "border-red-500/50 bg-red-500/10 text-red-300"
                                : isSelected
                                  ? "border-primary bg-primary/10 text-foreground"
                                  : "border-border bg-background text-muted-foreground hover:border-muted-foreground/40"
                          )}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                  {checkInAnswer !== null && !checkInSubmitted && (
                    <Button
                      onClick={handleCheckInSubmit}
                      className="mt-3 w-full bg-primary text-primary-foreground hover:bg-primary/90"
                      size="sm"
                    >
                      <Check className="w-3.5 h-3.5 mr-1.5" />
                      Submit
                    </Button>
                  )}
                </div>
              </motion.div>
            )}

            {currentPrediction && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute inset-x-0 bottom-20 flex justify-center px-4 z-10"
              >
                <div className="max-w-md w-full p-5 rounded-xl bg-card border border-border shadow-xl">
                  <p className="text-sm font-medium text-foreground mb-3">
                    {currentPrediction.question}
                  </p>
                  {currentPrediction.options && currentPrediction.options.length > 0 ? (
                    <div className="space-y-2">
                      {currentPrediction.options.map((option, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            recordSessionEvent("prediction_answered", {
                              question: currentPrediction.question,
                              answer: option,
                              selected: idx,
                              correct: idx === currentPrediction.correctOption,
                              step_index: currentStepIndex,
                            });
                            // Brief delay to show result, then advance
                            setTimeout(() => advance(), 1200);
                          }}
                          className={cn(
                            "w-full text-left px-4 py-2.5 rounded-lg text-sm transition-all border",
                            "border-border bg-background text-muted-foreground hover:border-primary hover:bg-primary/10"
                          )}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <Button
                      onClick={handlePredictionSubmit}
                      className="w-full bg-secondary text-foreground border border-border hover:bg-muted"
                      size="sm"
                    >
                      Continue
                    </Button>
                  )}
                </div>
              </motion.div>
            )}

            {currentFillBlank && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute inset-x-0 bottom-20 flex justify-center px-4 z-10"
              >
                <div className="max-w-md w-full p-5 rounded-xl bg-card border border-border shadow-xl">
                  <p className="text-sm font-medium text-foreground mb-3">
                    {currentFillBlank.prompt}
                  </p>
                  <input
                    type="text"
                    value={fillBlankAnswer}
                    onChange={(e) => setFillBlankAnswer(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm placeholder:text-muted-foreground/70 focus:outline-none focus:border-ring"
                    placeholder="Type your answer..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleFillBlankSubmit();
                    }}
                  />
                  <Button
                    onClick={handleFillBlankSubmit}
                    className="mt-3 w-full bg-primary text-primary-foreground hover:bg-primary/90"
                    size="sm"
                    disabled={!fillBlankAnswer.trim()}
                  >
                    Submit
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Narration Bar */}
          <div className="px-4 py-2 border-t border-border/50 bg-card/80 shrink-0 max-h-20 overflow-y-auto">
            <AnimatePresence mode="wait">
              {whiteboardSteps[currentStepIndex] && (
                <motion.div
                  key={currentStepIndex}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="text-sm text-muted-foreground leading-relaxed"
                >
                  {whiteboardSteps[currentStepIndex].displayText ? (
                    <MathContent
                      content={whiteboardSteps[currentStepIndex].displayText!}
                    />
                  ) : whiteboardSteps[currentStepIndex].narration ? (
                    <span>{whiteboardSteps[currentStepIndex].narration}</span>
                  ) : null}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Step Navigation Bar */}
          <div className="px-4 py-2 border-t border-border bg-card flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                Step {Math.max(userStepIndex + 1, 1)} of{" "}
                {whiteboardSteps.length || "..."}
              </span>
              {isWhiteboardStreaming && (
                <span className="text-xs text-primary animate-pulse">
                  streaming
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isLastStep ? (
                <Button
                  onClick={handleEndSession}
                  size="sm"
                  className="bg-green-600 text-white hover:bg-green-700"
                >
                  <Check className="w-3.5 h-3.5 mr-1.5" />
                  Complete
                </Button>
              ) : (
                <Button
                  onClick={advance}
                  disabled={!canAdvance}
                  size="sm"
                  className="bg-secondary text-foreground border border-border hover:bg-muted disabled:opacity-40"
                >
                  Continue
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </div>}

        {/* Chat Panel */}
        <AnimatePresence>
          {chatOpen && (
            <motion.div
              initial={{ x: 360, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 360, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="absolute right-0 top-0 bottom-0 w-[360px] border-l border-border bg-card flex flex-col z-20"
            >
              {/* Chat Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="text-sm font-medium text-foreground">
                  Ask {agentName}
                </span>
                <button
                  onClick={() => setChatOpen(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                {messages.length === 0 && (
                  <p className="text-xs text-muted-foreground/70 text-center mt-8">
                    Ask a question about the lesson
                  </p>
                )}
                {messages.map((msg, i) => (
                  <MessageBubble
                    key={i}
                    role={msg.role}
                    content={msg.content}
                    isStreaming={msg.isStreaming}
                  />
                ))}
                {isProcessing &&
                  !messages.some((m) => m.isStreaming && m.content) && (
                    <ThinkingIndicator />
                  )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <form
                onSubmit={handleChatSubmit}
                className="px-4 py-3 border-t border-border"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask a question..."
                    disabled={isProcessing}
                    className="flex-1 px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm placeholder:text-muted-foreground/70 focus:outline-none focus:border-ring disabled:opacity-50"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!chatInput.trim() || isProcessing}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
