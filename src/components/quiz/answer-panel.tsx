"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MathContent } from "./math-content";
import type { Problem } from "./types";

export type FeedbackState = {
  type: "correct" | "wrong";
  correctOption: number;
};

type AnswerPanelProps = {
  problem: Problem;
  questionNumber: number;
  selectedOption: number | undefined;
  isMarked: boolean;
  onSelect: (optionIndex: number) => void;
  onToggleMark: () => void;
  direction: number;
  feedbackState?: FeedbackState;
  disabled?: boolean;
  showMark?: boolean;
  hideHeaderOnMobile?: boolean;
  className?: string;
  children?: React.ReactNode;
};

export function AnswerPanel({
  problem,
  selectedOption,
  isMarked,
  onSelect,
  onToggleMark,
  direction,
  feedbackState,
  disabled,
  showMark = true,
  hideHeaderOnMobile = true,
  className,
  children,
}: AnswerPanelProps) {
  return (
    <div
      className={cn(
        "min-w-0 flex-1 p-4 pt-0 sm:p-6 sm:pt-6 md:overflow-y-auto",
        className,
      )}
    >
      <div className="max-h-[calc(100dvh-220px)] rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6 overflow-hidden flex flex-col">
        {showMark && (
          <div
            className={cn(
              " flex items-center justify-end",
              hideHeaderOnMobile && "hidden md:flex",
            )}
          >
            {/* <Button
              variant="ghost"
              size="sm"
              onClick={onToggleMark}
              className={cn(isMarked && "text-primary")}
            >
              <Bookmark
                className={cn("mr-1 h-4 w-4", isMarked && "fill-primary")}
              />
              Mark for Review
            </Button> */}
          </div>
        )}

        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={problem.id}
            custom={direction}
            initial={{ opacity: 0, x: direction * 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -20 }}
            transition={{ duration: 0.2 }}
            className="min-h-0 flex-1 overflow-y-auto space-y-3 pr-1"
          >
            {problem.options.map((option, i) => {
              const letter = String.fromCharCode(65 + i);
              const isSelected = selectedOption === i;
              const isCorrectFeedback =
                feedbackState &&
                feedbackState.type === "correct" &&
                i === feedbackState.correctOption;
              const isWrongFeedback =
                feedbackState && feedbackState.type === "wrong" && isSelected;

              return (
                <motion.button
                  key={i}
                  whileTap={!disabled ? { scale: 0.98 } : undefined}
                  onClick={() => !disabled && onSelect(i)}
                  disabled={disabled}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-lg border border-border bg-background px-4 py-3 text-left text-sm transition-colors",
                    !feedbackState && isSelected
                      ? "border-primary bg-primary/5"
                      : !feedbackState && !disabled
                        ? "hover:border-primary/30 hover:bg-primary/5"
                        : "",
                    isCorrectFeedback && "border-athena-success bg-athena-success/10",
                    isWrongFeedback && "border-destructive bg-destructive/10",
                    feedbackState &&
                      !isCorrectFeedback &&
                      !isWrongFeedback &&
                      "opacity-50",
                    disabled && "cursor-default",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium",
                      !feedbackState &&
                        isSelected &&
                        "border-primary bg-primary text-primary-foreground",
                      isCorrectFeedback &&
                        "border-athena-success bg-athena-success text-white",
                      isWrongFeedback &&
                        "border-destructive bg-destructive text-white",
                    )}
                  >
                    {letter}
                  </span>
                  <span className="min-w-0 flex-1 pt-0.5">
                    <MathContent content={option} />
                  </span>
                </motion.button>
              );
            })}
          </motion.div>
        </AnimatePresence>
        {children}
      </div>
    </div>
  );
}