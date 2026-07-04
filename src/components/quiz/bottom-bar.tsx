"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { QuestionNavigator } from "./question-navigator";
import type { QuestionStatus } from "./types";

type BottomBarProps = {
  currentIndex: number;
  total: number;
  unansweredCount: number;
  onBack: () => void;
  onNext: () => void;
  onGoTo: (index: number) => void;
  onSubmit: () => void;
  getStatus: (index: number) => QuestionStatus;
  /** Sequential mode: disable Back always, hide question navigator, show Next only after answer */
  sequential?: boolean;
  /** Externally control whether Next is disabled */
  nextDisabled?: boolean;
  /** Called on last question instead of onSubmit for onboarding completion flow */
  onFinish?: () => void;
};

export function BottomBar({
  currentIndex,
  total,
  unansweredCount,
  onBack,
  onNext,
  onGoTo,
  onSubmit,
  getStatus,
  sequential = false,
  nextDisabled,
  onFinish,
}: BottomBarProps) {
  const [navOpen, setNavOpen] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const isLast = currentIndex === total - 1;

  const handleSubmitClick = () => {
    if (onFinish) {
      onFinish();
    } else {
      setConfirmSubmit(true);
    }
  };

  const handleNavJump = (index: number) => {
    onGoTo(index);
    setNavOpen(false);
  };

  return (
    <>
      <div className="flex h-14 shrink-0 items-center gap-2 border-t bg-card px-2 sm:px-4">
        <Button
          variant="outline"
          size="sm"
          onClick={onBack}
          disabled={sequential || currentIndex === 0}
          className="shrink-0 px-2 sm:px-3"
        >
          <ChevronLeft className="h-4 w-4 sm:mr-1" />
          <span className="hidden sm:inline">Back</span>
        </Button>
        {!sequential ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setNavOpen(true)}
            className="min-w-0 flex-1 truncate px-2 font-medium sm:flex-none sm:px-3"
          >
            <span className="sm:hidden">
              {currentIndex + 1}/{total}
            </span>
            <span className="hidden sm:inline">
              Question {currentIndex + 1} of {total}
            </span>
            <ChevronDown className="ml-1 h-4 w-4 shrink-0" />
          </Button>
        ) : (
          <span className="min-w-0 flex-1 truncate text-center text-sm font-medium text-muted-foreground">
            <span className="sm:hidden">
              {currentIndex + 1}/{total}
            </span>
            <span className="hidden sm:inline">
              Question {currentIndex + 1} of {total}
            </span>
          </span>
        )}
        <div className="flex shrink-0 items-center">
          {isLast ? (
            <Button
              size="sm"
              onClick={handleSubmitClick}
              disabled={nextDisabled}
              className="px-2 sm:px-3"
            >
              {onFinish ? "Finish" : "Submit"}
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={onNext}
              disabled={nextDisabled}
              className="px-2 sm:px-3"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="h-4 w-4 sm:ml-1" />
            </Button>
          )}
        </div>
      </div>

      {!sequential && (
        <QuestionNavigator
          open={navOpen}
          onOpenChange={setNavOpen}
          total={total}
          currentIndex={currentIndex}
          getStatus={getStatus}
          onNavigate={handleNavJump}
        />
      )}

      {!onFinish && (
        <Dialog open={confirmSubmit} onOpenChange={setConfirmSubmit}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Submit Quiz?</DialogTitle>
              <DialogDescription>
                {unansweredCount > 0
                  ? `You have ${unansweredCount} unanswered question${unansweredCount > 1 ? "s" : ""}. Are you sure you want to submit?`
                  : "Are you sure you want to submit your answers?"}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setConfirmSubmit(false)}
              >
                Review Answers
              </Button>
              <Button
                onClick={() => {
                  setConfirmSubmit(false);
                  onSubmit();
                }}
              >
                Submit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
