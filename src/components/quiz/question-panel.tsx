"use client";

import { useState, useEffect, useMemo } from "react";
import { ChevronDown, ChevronUp, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { stripEmbeddedOptions } from "@/lib/strip-embedded-options";
import { MathContent } from "./math-content";
import type { Problem } from "./types";

type QuestionPanelProps = {
  problem: Problem;
  questionNumber: number;
  /** When true, hint button appears and hint is auto-opened */
  hintRevealed?: boolean;
  /** Subtle highlight to draw attention to the question card */
  emphasize?: boolean;
  /** Optional pacing timer (or other chrome) rendered above the question card */
  aboveCard?: React.ReactNode;
  className?: string;
};

export function QuestionPanel({
  problem,
  questionNumber,
  hintRevealed = false,
  emphasize = false,
  aboveCard,
  className,
}: QuestionPanelProps) {
  const [hintOpen, setHintOpen] = useState(false);

  useEffect(() => {
    if (hintRevealed) setHintOpen(true);
  }, [hintRevealed]);

  const stem = useMemo(
    () => stripEmbeddedOptions(problem.questionText, problem.options),
    [problem.questionText, problem.options],
  );

  return (
    <div
      className={cn(
        "min-w-0 shrink-0 p-4 sm:p-6 md:flex-1 md:shrink md:overflow-y-auto",
        className,
      )}
    >
      {aboveCard}
      <div
        className={cn(
          "max-h-[calc(100dvh-220px)] rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6 overflow-hidden",
          emphasize && "border-primary/30 bg-primary/5"
        )}
      >
        <div className="mb-4">
          <span className="text-sm font-semibold text-primary">
            Question {questionNumber}
          </span>
        </div>

        <div className="min-h-0 overflow-y-auto pr-1">
          <MathContent content={stem} />
        </div>

      {problem.hint && hintRevealed && (
        <div className="mt-6">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => setHintOpen((h) => !h)}
          >
            <Lightbulb className="mr-1 h-4 w-4" />
            Need a hint?
            {hintOpen ? (
              <ChevronUp className="ml-1 h-3 w-3" />
            ) : (
              <ChevronDown className="ml-1 h-3 w-3" />
            )}
          </Button>
          {hintOpen && (
            <div className="mt-2 rounded-md bg-muted p-3 text-sm text-muted-foreground">
              <MathContent content={problem.hint} />
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}
